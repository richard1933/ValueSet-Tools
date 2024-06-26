"""Load data into the database and CREATE INDEXes and derived tables"""
from datetime import datetime
from typing import Dict, List

from sqlalchemy.engine.base import Connection

from backend.db.config import CONFIG
from backend.db.utils import get_ddl_statements, check_if_updated, current_datetime, insert_from_dict, \
    is_table_up_to_date, load_csv, refresh_any_dependent_tables, run_sql, get_db_connection, sql_in, \
    sql_query, update_db_status_var
from enclave_wrangler.config import DATASET_REGISTRY
from enclave_wrangler.datasets import download_datasets
from enclave_wrangler.objects_api import download_favorite_objects

DB = CONFIG["db"]
SCHEMA = CONFIG['schema']
DATASET_TABLES = [
    # Vocab
    'concept',
    'concept_ancestor',
    'concept_relationship',
    'relationship',
    # 'concept_relationship_subsumes_only',
    # Core
    'code_sets',
    'concept_set_container',
    'concept_set_members',
    'concept_set_version_item',
    # Counts
    'concept_set_counts_clamped',
    'deidentified_term_usage_by_domain_clamped',
]
# table.lower(): because postgres won't recognize names with caps in them unless they are "quoted". should probably
#  do this with colnames also, but just using quotes in ddl
OBJECT_TABLES = [x.lower() for x in [
    'researcher',
    'OMOPConceptSet',  # i to include RID
    'OMOPConceptSetContainer',  # to include RID
    # 'OmopConceptSetVersionItem', only need this if we want the RID, but maybe don't need it
]]
OBJECT_TABLES_TEST = []
DATASET_TABLES_TEST = [
    'concept', 'code_sets', 'concept_set_container', 'concept_set_members', 'concept_set_version_item']
DATASET_TABLES_TEST_CONFIG = {k: v for k, v in DATASET_REGISTRY.items() if k in DATASET_TABLES_TEST}

def download_artefacts(force_download_if_exists=False):
    """Download essential DB artefacts to be uploaded
    todo: speed up usinc async: https://stackoverflow.com/a/33399896/5258518"""
    print('INFO: Downloading datasets: csets.')
    download_datasets(force_if_exists=force_download_if_exists, single_group='cset')
    print('INFO: Downloading datasets: objects.')
    download_favorite_objects(force_if_exists=force_download_if_exists)
    print('INFO: Downloading datasets: vocab.')
    download_datasets(force_if_exists=force_download_if_exists, single_group='vocab')


def initialize_test_schema(con_initial: Connection, schema: str = SCHEMA, local=False):
    """Initialize test schema

    :param: con_initial: Should be a connection to the DB itself and not any particular schema."""
    # Set up
    test_schema = 'test_' + schema
    run_sql(con_initial, f'CREATE SCHEMA IF NOT EXISTS {test_schema};')
    with get_db_connection(schema=test_schema, local=local) as con_test_schema:
        if test_schema == 'n3c':  # given the above lines, I don't see how it could ever be n3c, but this is a safeguard
            raise RuntimeError('Incorrect schema. Should be dropping table from test_n3c.')
        for table in DATASET_TABLES_TEST_CONFIG.keys():
            run_sql(con_test_schema, f'DROP TABLE IF EXISTS {test_schema}.{table};')

    # Seed data
    seed(con_initial, test_schema, clobber=True, dataset_tables=list(DATASET_TABLES_TEST_CONFIG.keys()),
         object_tables=OBJECT_TABLES_TEST, test_tables=True, local=local)
    # - Data in `concept_set_members` table should exist in `concept` and `code_sets` tables
    with get_db_connection(schema=test_schema, local=local) as con_test_schema:
        cset_member_rows = [dict(x) for x in sql_query(con_test_schema, 'SELECT * FROM concept_set_members;')]
        codeset_ids, concept_ids = [list(y) for y in zip(*[(x['codeset_id'], x['concept_id']) for x in cset_member_rows])]
    with get_db_connection(schema=schema, local=local) as con_main_schema:
        codeset_rows = [dict(x) for x in sql_query(
            con_main_schema, f'SELECT * FROM code_sets WHERE codeset_id {sql_in(codeset_ids)};')]
        concept_rows = [dict(x) for x in sql_query(
            con_main_schema, f'SELECT * FROM concept WHERE concept_id {sql_in(concept_ids)};')]
    with get_db_connection(schema=test_schema, local=local) as con_test_schema:
        for row in codeset_rows:
            insert_from_dict(con_test_schema, 'code_sets', row)
        for row in concept_rows:
            insert_from_dict(con_test_schema, 'concept', row)

    # Set primary keys
    with get_db_connection(schema=test_schema, local=local) as con_test_schema:
        for table, d in DATASET_TABLES_TEST_CONFIG.items():
            pk = d['primary_key']
            pk = pk if isinstance(pk, str) else ', '.join(pk)
            run_sql(con_test_schema, f'ALTER TABLE {test_schema}.{table} ADD PRIMARY KEY({pk});')

    # Create derived tables
    n_rows = str(10)  # arbitrary
    other_dependency_tables = [  # these tables are referenced, e.g. selections/joins to create derived tables
        'omopconceptset',
        'omopconceptsetcontainer',
        'concept_set_counts_clamped']
    for table in other_dependency_tables:
        run_sql(con_initial,
                f'CREATE TABLE IF NOT EXISTS {test_schema}.{table} AS SELECT * FROM {schema}.{table} LIMIT {n_rows};')
    refresh_any_dependent_tables(con_initial, schema=test_schema)


def seed(
    con: Connection, schema: str = SCHEMA, clobber=False, replace_rule=None, skip_if_updated_within_hours: int = None,
    dataset_tables: List[str] = DATASET_TABLES, object_tables: List[str] = OBJECT_TABLES, test_tables=False, local=False
):
    """Seed the database with some data"""
    if not replace_rule:
        replace_rule = 'do not replace' if not clobber else None

    for table in dataset_tables:
        if is_table_up_to_date(table, skip_if_updated_within_hours):
            print(f'INFO: Skipping upload of table "{table}" because it is up to date.')
            continue
        load_csv(con, table, replace_rule=replace_rule, schema=schema, is_test_table=test_tables, local=local)
    for table in object_tables:
        if is_table_up_to_date(table, skip_if_updated_within_hours):
            print(f'INFO: Skipping upload of table "{table}" because it is up to date.')
            continue
        load_csv(
            con, table, table_type='object', replace_rule=replace_rule, schema=schema, is_test_table=test_tables,
            local=local)


# TODO: This function and more needs to be renamed and checked for any bugs. This is no longer just about derived
#  tables. See: https://github.com/jhu-bids/TermHub/issues/752
def make_derived_tables_and_more(
    con: Connection, schema_name: str, skip_if_updated_within_hours: int = None, start_step: int = None, local=False
):
    """Runs DDL files, creating derived tables, as well as various other things, including:
    - setting column types
    - creating functions
    - creating indexes
    - settign primary keys
    - creating extra, meta/management tables in the 'public' schema

    todo: print updates: (i) when picking up where it left off, don't need to print "module n of n" if all steps in that
     module have already been completed; pick up on the module it left off on (ii) for that module, put
     "- n (step n) - previously completed" for all steps previously done.

    """
    # Determine and set up progress tracking
    last_completed_key = 'last_updated_indexes_and_derived_tables'
    last_successful_step_key = 'last_step_indexes_and_derived_tables'
    if skip_if_updated_within_hours and \
            check_if_updated(last_completed_key, skip_if_updated_within_hours):
        print(f'INFO: Skipping creation of indexes and derived tables because they are up to date.')
        return

    # Read DDL
    print('INFO: Creating derived tables (e.g. `all_csets`) and indexes.')
    statements_by_module: Dict[str, List[str]] = get_ddl_statements(schema=schema_name)
    steps = sum([len(x) for x in statements_by_module.values()])

    # Determine which steps still needed
    if start_step:
        last_successful_step = start_step
    else:
        with get_db_connection(schema='', local=local) as con2:
            last_successful_step = run_sql(
                con2, f"SELECT value FROM public.manage WHERE key = '{last_successful_step_key}';").first()
        last_successful_step = int(last_successful_step[0]) if last_successful_step else None
        print('INFO: Creating derived tables (e.g. `all_csets`) and indexes.')
    if last_successful_step:
        print(f'INFO: Last successful command was {last_successful_step} of {steps}. '
              f'Continuing from the next step after.')

    # Updates
    i, j = 0, 0
    print(f'INFO: indexes_and_derived_tables: Running SQL commands ({steps} steps total).')
    for module_tag, statements in statements_by_module.items():
        k = 0
        i += 1
        module_name = module_tag.split('-')[-1]
        t0 = datetime.now()
        print(f' - Module {i} of {len(statements_by_module)}: {module_name} ({len(statements)} commands)')
        for statement in statements:
            j += 1
            k += 1
            if last_successful_step and last_successful_step >= j:
                continue
            print(f'  - {k} (step {j})')
            try:
                pass
                run_sql(con, statement)
                update_db_status_var(last_successful_step_key, str(j), local)
            except Exception as err:
                update_db_status_var(last_successful_step_key, str(j - 1), local)
                raise err
        t1 = datetime.now()
        print(f'  - completed in {(t1 - t0).seconds} seconds')

    update_db_status_var(last_successful_step_key, '0', local)
    update_db_status_var(last_completed_key, str(current_datetime()), local)


# todo: this has no usages. it used to be used by initialize(), but no more. remove?
def load(
    schema: str = SCHEMA, clobber=False, skip_if_updated_within_hours: int = None, use_local_db=False
):
    """Load data into the database and CREATE INDEXes and derived tables"""
    with get_db_connection(local=use_local_db) as con:
        # download_artefacts(force_download_if_exists=False)
        seed(con, schema, clobber, skip_if_updated_within_hours, local=use_local_db)
        make_derived_tables_and_more(con, schema, skip_if_updated_within_hours, local=use_local_db)


# Common operations
if __name__ == '__main__':
    # load()
    with get_db_connection(local=True) as conn:
        # initialize_test_schema(conn, local=True)
        # seed(conn, 'n3c', clobber=True, skip_if_updated_within_hours=False, local=False,
        #      dataset_tables=[], object_tables=['researcher'])
        # indexes_and_derived_tables(conn, 'n3c', local=True)
        pass
