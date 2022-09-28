import React from 'react';
import DataTable, { createTheme } from 'react-data-table-component';

// createTheme creates a new theme named solarized that overrides the build in dark theme
// https://github.com/jbetancur/react-data-table-component/blob/master/src/DataTable/themes.ts
createTheme('custom-theme', {
    text: {
      primary: '#268bd2',
      secondary: '#2aa198',
    },
    context: {
        background: '#cb4b16',
        text: '#FFFFFF',
    },
    /*
    divider: {
        default: '#073642',
    },
    background: {
        default: '#002b36',
    },
    action: {
      button: 'rgba(0,0,0,.54)',
      hover: 'rgba(0,0,0,.08)',
      disabled: 'rgba(0,0,0,.12)',
    },
    */
}, 'light');


// import Checkbox from '@material-ui/core/Checkbox';
// import ArrowDownward from '@material-ui/icons/ArrowDownward';
// const sortIcon = <ArrowDownward />;
// const selectProps = { indeterminate: isIndeterminate => isIndeterminate };

// https://react-data-table-component.netlify.app/?path=/docs/api-custom-styles--page
//  Internally, customStyles will deep merges your customStyles with the default styling.

function CsetsDataTable(props) {
    let {cset_data} = props;
    let {csets_info, lines, related_csets} = cset_data;

    console.log(props);
    /*  example row
    {
        "codeset_id": 826535586,
        "concept_set_name": "UVA Equity Asthma",
        "version": "1",
        "concepts": 619,
        "selected": true
    }
    */
    let columns = [
        // { name: 'level', selector: row => row.level, },
        {
            name: 'Concept set name',
            selector: row => `${row.concept_set_name} (v${row.version})`,
            wrap: true,
            compact: true,
        },
        {
            name: 'Concepts',
            selector: row => row.concepts,
            wrap: true,
            compact: true,
            width: '70px',
            center: true,
        },
    ];
    /*
    const conditionalRowStyles = [{
        when: row => row.selected,
        style: {
            backgroundColor: 'rgba(63, 195, 128, 0.9)',
            color: 'white',
            '&:hover': {
                cursor: 'pointer',
            },
        }
    }];
    */
    const customStyles = {
        /*
        	tableWrapper: {
            style: {
              display: 'table',
            },
          },
            denseStyle: {
                minHeight: '32px',
            },
        */
        table: {
            style: {
                padding: '20px',
                width: '100%',
                // margin: '20px',
                // height: '20vh',
                // maxWidth: '85%',
                // maxWidth: '400px', doesn't work ?
            }
        },
        /*
        headRow: {
            style: {
                // backgroundColor: theme.background.default,
                // height: '152px',
                // borderBottomWidth: '1px',
                // borderBottomColor: theme.divider.default,
                borderBottomStyle: 'solid',
                padding: 0,
                verticalAlign: 'bottom',
                // border: '3px solid red',
                overflow: 'visible',
                textOverflow: 'unset',
                marginTop: 'auto',
            },
          },
        headCells: {
            style: {
                // transform: 'translate(10px,-15px) rotate(-45deg)',
                // transform: 'translate(0px,30px)',
                // height: '100%',
                // position: 'absolute',
                overflow: 'visible',
                verticalAlign: 'bottom', // doesn't work
                marginTop: 'auto',
                // border: '3px solid green',
                padding: 0,
                // paddingLeft: '8px', // override the cell padding for head cells
                // paddingRight: '8px',
            },
        },
        rows: {
            style: {
                marginLeft: '20px',
                padding: '20px',
                minHeight: 'auto', // override the row height
                borderLeft: '0.5px solid #BBB',
            },
        },
        cells: {
            style: {
                // paddingLeft: '8px', // override the cell padding for data cells
                // paddingRight: '8px',
                padding: 0, //'0px 5px 0px 5px',
                borderRight: '0.5px solid #BBB',
            },
        },
        */
    };

    return (
            <DataTable

                // theme="custom-theme"
                // theme="light"
                columns={columns}
                data={related_csets}
                customStyles={customStyles}
                // conditionalRowStyles={conditionalRowStyles}

                height={300}
                highlightOnHover
                responsive
                //striped
                subHeaderAlign="right"
                subHeaderWrap
                //pagination
                //selectableRowsComponent={Checkbox}
                //selectableRowsComponentProps={selectProps}
                //sortIcon={sortIcon}
                // {...props}

                  dense
                  direction="auto"
                  expandOnRowClicked
                  expandableRows
                  fixedHeader
                  fixedHeaderScrollHeight="300px"
                  highlightOnHover
                  pointerOnHover
                  responsive
                  selectableRows
                  selectableRowsHighlight
                  subHeaderAlign="right"
                  subHeaderWrap
            />
    );
}

export {CsetsDataTable};


/*
from https://react-data-table-component.netlify.app/?path=/docs/getting-started-kitchen-sink--kitchen-sink
<KitchenSinkStory
  dense
  direction="auto"
  fixedHeader
  fixedHeaderScrollHeight="300px"
  highlightOnHover
  responsive
  striped
  subHeaderAlign="right"
  subHeaderWrap
/>
 */