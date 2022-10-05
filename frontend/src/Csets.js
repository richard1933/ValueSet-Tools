/*
TODO's
  1. todo: Page state refresh should not be 'on window focus', but on autocomplete widget selection
  2. todo: later: associated concepts: show them the concepts associated with the concept sets they've selected
  3. todo: later: intensionality: also show them concept version items (intensional). but once we've got more than one cset
      selected, start doing comparison stuff

*/
import React, {useState, useEffect, /* useReducer, useRef, */} from 'react';
import {useQuery} from "@tanstack/react-query";
import axios from "axios";
import {Table, ComparisonTable} from "./Table";
import {ComparisonDataTable} from "./ComparisonDataTable";
import {CsetsDataTable} from "./CsetsDataTable";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import { Link, Outlet, useHref, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import _ from 'lodash';

import {backend_url} from './App';

//TODO: How to get hierarchy data?
// - It's likely in one of the datasets we haven't downloaded yet. When we get it, we can do indents.

function ConceptList(props) {
  // http://127.0.0.1:8000/fields-from-objlist?objtype=OmopConceptSetVersionItem&filter=codeset_id:822173787|74555844
  const codeset_ids = props.codeset_ids || [];
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
  const {codeset_ids=[], cset_data={}} = props;
  const {flattened_concept_hierarchy=[], concept_set_members_i=[], all_csets=[], } = cset_data;
  const [value, setValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // need to include codeset_id in label because there are sometimes two csets with same name
  //  and same version number, and label acts as key
  const opts = (
      all_csets
          .filter(d => !d.selected)
          .map(d => ({
            label: `${d.codeset_id} - ${d.concept_set_version_title} ` +
                   `${d.archived ? 'archived' : ''} (${d.concepts} concepts)`,
            id: d.codeset_id,
  })));

  const autocomplete = (
      // https://mui.com/material-ui/react-autocomplete/
      <Autocomplete
          disablePortal
          id="add-codeset-id"
          options={opts}
          blurOnSelect={true}
          clearOnBlur={true}
          sx={{ width: '100%', }}
          renderInput={(params) => <TextField {...params} label="Add concept set" />}
          onChange={(event, newValue) => {
            setSearchParams({codeset_id: [...codeset_ids, newValue.id]})
          }}
      />);
  return (
    <div style={{padding:'9px', }}>
      {autocomplete}
    </div>)
  /* want to group by cset name and then list version. use https://mui.com/material-ui/react-autocomplete/ Grouped
     and also use Multiple Values */
}

function ConceptSetsPage(props) {
  let navigate = useNavigate();
  const codeset_ids = props.codeset_ids || [];
  let enabled = !!codeset_ids.length

  // pre-2022/09/07 url (for temporary reference):
  // let url = backend_url('fields-from-objlist?') +
  //     [
  //       'objtype=OMOPConceptSet',
  //       'filter=codeset_id:' + codeset_ids.join('|')
  //     ].join('&')
  let url = backend_url('concept-sets-with-concepts?concept_field_filter=concept_id&concept_field_filter=concept_name&codeset_id=' + codeset_ids.join('|'))

  const { isLoading, error, data, isFetching } = useQuery([url], () => {
    //if (codeset_ids.length) {
      console.log('fetching backend_url', url)
      console.log(enabled)  // TODO: remove these when done debugging
      console.log(codeset_ids)
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
  let msg = enabled
              ? (isLoading && <p>Loading from {link}...</p>) ||
                (error && <p>An error has occurred with {link}: {error.stack}</p>) ||
                (isFetching && <p>Updating from {link}...</p>)
              : "Choose one or more concept sets";
  return (
      <div>
        <CsetSearch {...props} />
        { enabled || msg }
        {
           props.cset_data && <CsetsDataTable {...props} />
        }
        {
          // todo: Create component: <ConceptSetsPanels>
          (codeset_ids.length > 0) && data && (
            <div style={{
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              // height: '90vh',
              // alignItems: 'stretch',
              // border: '1px solid green',

              // todo: I don't remember how to get it to take up the whole window in this case.  these are working
              // width: '100%',
              // 'flex-shrink': 0,
              // flex: '0 0 100%',
            }}>
              {data.map(cset => {
                let widestConceptName = _.max(Object.values(cset.concepts).map(d => d.concept_name.length))
                return <ConceptSetCard key={cset.codeset_id} cset={cset} widestConceptName={widestConceptName}
                                       cols={Math.min(4, data.length)}/>
              })}
            </div>)
        }
        {/*<p>I am supposed to be the results of <a href={url}>{url}</a></p>*/}
      </div>)
}
function ConceptSetCard(props) {
  let {cset, cols} = props;
  return (
      // (isLoading && "Loading...") ||
      // (error && `An error has occurred: ${error.stack}`) ||
      // (isFetching && "Updating...") ||
      // (data && <div style={{
      (<div style={{
        flex: '1 1 auto',
        height: '400px',    // can't figure out how to make these fill but not overfill the window with rows
        width: '300px',
        padding: '1px 15px 1px 15px',
        margin: '5px 5px 5px 5px',
        border: '5px 5px 5px 5px',
        background: '#d3d3d3',
        borderRadius: '10px',
        // width: Math.floor(100 / cols) + 'vh',
      }}>
        <h4>{cset.concept_set_name/*conceptSetNameOMOP*/} v{cset.version}</h4>
        <List style={{height: '70%', overflowX: 'clip', overflowY: 'scroll'}}>
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

// TODO: Find concepts w/ good overlap and save a good URL for that
// TODO: show table w/ hierarchical indent
// TODO: Color table: I guess would need to see if could pass extra values/props and see if table widget can use that
//  ...for coloration, since we want certain rows grouped together
function CsetComparisonPage(props) {
  console.log(props);
  return (
      <div>
        <ComparisonDataTable {...props} />
      </div>)
}

export {ConceptSetsPage, CsetComparisonPage, };