/*
TODO's
  1. Put the table back in (@Joe)
  2. Filtering & selecting 2 concept sets: (@Joe:First stab at filtering table)
    (A) keep combo box (input select list w/ an autocomplete) at the top. This box will have 2
  purposes: (i) you immediately see all the sets and their versions that are matched by what you're typing, and (ii),
  whatever you've typed in the combo box also filters the table.
  Additionally, combo box also supports multiple select (tags).
    (B) forget autocomplete and do filtering through table (might be too slow) and do multiple select by enabling
  checkboxes on table rows so even if we filter the table, if we've checked any boxes, those rows shouldn't disappear
  once the user has checked to csets they want to work with, they need a button in order to launch analysis.
  ...
  later: associated concepts: show them the concepts associated with the concept sets they've selected
  later: intensionality: also show them concept version items (intensional). but once we've got more than one cset
  selected, start doing comparison stuff
  At that point, we can share.
*/
import {useQuery} from "@tanstack/react-query";
import axios from "axios";
import {Table, ComparisonTable} from "./Table";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import { Link, Outlet, useHref, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import React, {useState, useReducer, useEffect, useRef} from 'react';
import _ from 'lodash';
import {useGlobalState} from "./App";

const API_ROOT = 'http://127.0.0.1:8000'
const enclave_url = path => `${API_ROOT}/passthru?path=${path}`
const backend_url = path => `${API_ROOT}/${path}`


//TODO: How to get hierarchy data?
// - It's likely in one of the datasets we haven't downloaded yet. When we get it, we can do indents.
function ConceptSet(props) {
  let {cset} = props;
  return (
    // (isLoading && "Loading...") ||
    // (error && `An error has occurred: ${error.stack}`) ||
    // (isFetching && "Updating...") ||
    // (data && <div style={{
    (<div style={{
        padding: '1px 15px 1px 15px',
        margin: '5px 5px 5px 5px',
        border: '5px 5px 5px 5px',
        background: '#d3d3d3',
        borderRadius: '10px',
      }}>
        <h4>{cset.concept_set_name/*conceptSetNameOMOP*/} v{cset.version}</h4>
        <List>
          {Object.values(cset.concepts).map((concept, i) => {
            return <ListItem style={{
              margin: '3px 3px 3px 3px',
              background: '#dbdbdb',
              borderRadius: '5px',
              fontSize: '0.8em'
            }} key={i}>
              {concept.concept_id}: {concept.concept_name}
            </ListItem>
          })}
        </List>
      </div>)
  )
}

function ConceptList(props) {
  // http://127.0.0.1:8000/fields-from-objlist?objtype=OmopConceptSetVersionItem&filter=codeset_id:822173787|74555844
  const [qsParams, setQsParams] = useGlobalState('qsParams');
  //const [filteredData, setFilteredData] = useState([]);
  let codeset_ids = qsParams && qsParams.codeset_id && qsParams.codeset_id.sort() || []
  let enabled = !!codeset_ids.length

  let url = enabled ? backend_url('fields-from-objlist?') +
                      [
                        'objtype=OmopConceptSetVersionItem',
                        'filter=codeset_id:' + codeset_ids.join('|')
                      ].join('&')
                    : `invalid ConceptList url, no codeset_ids, enabled: ${enabled}`;

  const { isLoading, error, data, isFetching } = useQuery([url], () => {
    //if (codeset_ids.length) {
    //   console.log('fetching backend_url', url)
      return axios.get(url).then((res) => res.data)
      // console.log('enclave_url', enclave_url('objects/OMOPConceptSet'))
      // .then((res) => res.data.data.map(d => d.properties))
    //} else {
      //return {isLoading: false, error: null, data: [], isFetching: false}
    //}
  }, {enabled});
  // console.log('rowData', data)
  return  <div>
            <h4>Concepts:</h4>
            <Table rowData={data} />
          </div>
  /*
  let params = useParams();
  let {concept_id} = params;
  let path = `objects/OMOPConceptSet/${concept_id}/links/omopconcepts`;
  let url = enclave_url(path)
  const { isLoading, error, data, isFetching } = useQuery([path], () =>
      axios
          .get(url)
          .then((res) => res.data.data.map(d => d.properties)) )
  */
}

/* CsetSEarch: Grabs stuff from disk*/
/* TODO: Solve:
    react_devtools_backend.js:4026 MUI: The value provided to Autocomplete is invalid.
    None of the options match with `[{"label":"11-Beta Hydroxysteroid Dehydrogenase Inhibitor","codeset_id":584452082},{"label":"74235-3 (Blood type)","codeset_id":761463499}]`.
    You can use the `isOptionEqualToValue` prop to customize the equality test.
    @ SIggie: is this fixed?
*/
function CsetSearch(props) {
  let {applyChangeCallback} = props;
  const [qsParams, setQsParams] = useGlobalState('qsParams');

  let codeset_ids = qsParams && qsParams.codeset_id && qsParams.codeset_id.sort() || []

  let url = backend_url('cset-versions');

  // TODO: something like: http://localhost:3000/OMOPConceptSets?selected=7577017,7577017
  // let navigate = useNavigate();
  /*
  let defaultOptionsTest = [
    {"label": "11-Beta Hydroxysteroid Dehydrogenase Inhibitor", "codeset_id": 584452082},
    {"label": "74235-3 (Blood type)", "codeset_id": 761463499}
  ]
  const [csets, setCSets] = useState([]);
   */
  const [value, setValue] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const { isLoading, error, data, isFetching } = useQuery([url], () =>
    axios
      .get(url)
      .then((res) => {
        Object.keys(res.data[0]).forEach(csetName => {
          // delete junk concept set names
          if (csetName === 'null'             || // no name
              csetName.match(/^\d*$/) || // name is all digits
              csetName.match(/^ /)       // name starts with space
          ) {
            delete res.data[0][csetName]
          }
        })
        // let data = Object.entries(res.data[0]).map(([csetName,v], i) => ({label: csetName, version: v[0].version, codeset_id: v[0].codeset_id}))
        let data = Object.entries(res.data[0]).map(
          ([csetName,v], i) => {
            v = v.sort((a,b) => a.version - b.version)
            return {
              label: csetName + (v.length > 1 ? ` (${v.length} versions)` : ''),
              codeset_id: v.at(-1).codeset_id
              // versions: v.map(d=>d.version).join(', '),
              // v,
              // latest: v.at(-1),
            }
          })
        return data
      })
  );
  useEffect(() => {
    if (!data || !data.length) return
    let selectedCids = value && value.map(d => d.codeset_id).sort() || []
    if (!_.isEqual(codeset_ids, selectedCids)) {
      //console.log(value)
      //console.log(urlCids)
      let selection = (data || []).filter(d => codeset_ids.includes(d.codeset_id))
      setValue(selection)
    }
  }, [qsParams, data]);
  if (isLoading) {
    return "Loading...";
  }
  if (error) {
    console.error(error.stack)
    return "An error has occurred: " + error.stack;
  }

  return (
    <div style={{padding:'9px', }}>
      {/* <pre>getting data from: {url}</pre> */}
      {/* https://mui.com/material-ui/react-autocomplete/ */}
      {/* New way: manual state control; gets values from URL */}
      <Autocomplete
        multiple
        size="small"
        fullWidth={true}
        //disablePortal

        value={value}
        isOptionEqualToValue={(option, value) => {
          return option.codeset_id === value.codeset_id
        }}
        onChange={(event, newValue) => {
          setValue(newValue);
          let ids = newValue.map(d=>d.codeset_id)
          setSearchParams({codeset_id: ids})
        }}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => {
          // I think this is for changes in the options
          setInputValue(newInputValue);
        }}

        id="combo-box-demo-new"
        /* options={top100Films} */
        options={data}
        sx={{ width: 300 }}
        renderInput={(params) => (
            <TextField {...params}
                size="medium"
                label="Concept sets" />)}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option.label}
              size="small"
              {...getTagProps({ index })}
            />
          ))
        }
      />
    </div>)
  /* want to group by cset name and then list version. use https://mui.com/material-ui/react-autocomplete/ Grouped
     and also use Multiple Values */
}

// TODO: Page state refresh should not be 'on window focus', but on autocomplete widget selection
function ConceptSetsPage(props) {
  // return <CsetSearch />;
  let navigate = useNavigate();
  const [qsParams, setQsParams] = useGlobalState('qsParams');
  //const [filteredData, setFilteredData] = useState([]);
  let codeset_ids = qsParams && qsParams.codeset_id && qsParams.codeset_id.sort() || []
  let enabled = !!codeset_ids.length

  // pre-2022/09/07 url (for temporary reference):
  // let url = backend_url('fields-from-objlist?') +
  //     [
  //       'objtype=OMOPConceptSet',
  //       'filter=codeset_id:' + codeset_ids.join('|')
  //     ].join('&')
  let url = enabled ? backend_url('concept-sets-with-concepts?concept_field_filter=concept_id&concept_field_filter=concept_name&codeset_id=' + codeset_ids.join('|'))
                    : `invalid ConceptSetsPage url, no codeset_ids, enabled: ${enabled}`;

  const { isLoading, error, data, isFetching } = useQuery([url], () => {
    //if (codeset_ids.length) {
      console.log('fetching backend_url', url)
      return axios.get(url).then((res) => res.data)
      // console.log('enclave_url', enclave_url('objects/OMOPConceptSet'))
      // .then((res) => res.data.data.map(d => d.properties))
    //} else {
      //return {isLoading: false, error: null, data: [], isFetching: false}
    //}
  }, {enabled});
  async function csetCallback(props) {
    let {rowData, colClicked} = props
    navigate(`/OMOPConceptSet/${rowData.codeset_id}`)
  }


  //function applySearchFilter(filteredData, setFilteredData) { }

  let link = <a href={url}>{url}</a>;
  let msg = (isLoading && <p>Loading from {link}...</p>) ||
            (error && <p>An error has occurred with {link}: {error.stack}</p>) ||
            (isFetching && <p>Updating from {link}...</p>)
  return (
      <div>
        <CsetSearch/>
        {
          msg ||
          (data && (<div>did have tables here... should they come back?
            {/*Concepts: */}
            {/*<ConceptList />*/}
            {/*Concept sets: */}
            {/*<Table rowData={data} rowCallback={csetCallback}/>*/}
          </div>))
          //<ReactQueryDevtools initialIsOpen />
        }
        {
          // todo: Create component: <ConceptSetsPanels>
          (codeset_ids.length > 0) && data && (
            <div style={{
              display: 'flex',
              // todo: I don't remember how to get it to take up the whole window in this case.  these are working
              // width: '100%',
              // 'flex-shrink': 0,
              // flex: '0 0 100%',
            }}>
              {data.map(cset => {
                return <ConceptSet key={cset.codeset_id} cset={cset} />
              })}
            </div>)
        }
        {/*<p>I am supposed to be the results of <a href={url}>{url}</a></p>*/}
      </div>)
}

// TODO: Page state refresh should not be 'on window focus', but on autocomplete widget selection
// TODO: Should we move comparison logic python side and do query at new backend_url?
function CsetComparisonPage(props) {
  const [qsParams, setQsParams] = useGlobalState('qsParams');
  let codeset_ids = (qsParams && qsParams.codeset_id && qsParams.codeset_id.sort()) || []
  let enabled = !!codeset_ids.length
  let url = enabled ? backend_url('concept-sets-with-concepts?concept_field_filter=concept_id&concept_field_filter=concept_name&codeset_id=' + codeset_ids.join('|'))
      : `invalid CsetComparisonPage url, no codeset_ids, enabled: ${enabled}`;

  const { isLoading, error, data, isFetching } = useQuery([url], () => {
    return axios.get(url).then((res) => {
      let concepts2darr = res.data.map((row) => {return Object.keys(row.concepts)});
      let conceptsArr = [].concat(...concepts2darr);
      let conceptsSet = [...new Set(conceptsArr)];
      // todo: o(1) instead of o(n) would be better; like a python dict instead of array
      let csetIdConcepts = res.data.map((row) => {return {codeset_id: row.codeset_id, concept_ids: Object.keys(row.concepts)}});
      let tableData = conceptsSet.map((concept_id) => {return {'ConceptID': concept_id}});
      // todo: o(1) instead of o(n) would be better; like a python dict instead of array
      // Iterate over sets and put info in rows
      let tableData2 = []
      for (let row of tableData) {
        let newRow = row;
        for (let {codeset_id, concept_ids} of csetIdConcepts) {
          newRow[codeset_id] = 'X';
          for (let concept_id of concept_ids) {
            if (concept_id === row.ConceptID) {
              newRow[codeset_id] = 'O';
              break;
            }
          }
        }
        tableData2.push(newRow);
      }
      return tableData2
    })
  }, {enabled});

  return (
      <div>
        <CsetSearch/>
        {
          (isLoading && "Loading...") ||
          (error && `An error has occurred: ${error.stack}`) ||
          (isFetching && "Updating...") ||
          (data && (<div>
            <ComparisonTable
              rowData={data}
              firstColName={'ConceptID'}
            />
          </div>))
        }
      </div>)
}


export {ConceptSetsPage, CsetSearch, ConceptList, CsetComparisonPage};