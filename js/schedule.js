const gsheetID = '1AiBjC9YapNJEHgHpqXvNOOVOZO_5h-KDaJQEmtz3jzI';
const gsheetSheetNum = '1';
let columns = [];
let data = [];
let $schedule = $('#schedule-view div');

function parseGoogleSheetsJSONFeed(data) {

  const sheet = {};
  sheet.rows = data.feed.entry;
  
  sheet.dims = [
    Number(data.feed.gs$colCount.$t),
    Number(sheet.rows[sheet.rows.length - 1].gs$cell.row)
  ];
  
  sheet.headers = []
  for (let i = 0; i < sheet.dims[0]; i++) {
    sheet.headers.push(sheet.rows.shift().content.$t);
  }

  columns = sheet.headers;
  
  let rows = [];
  
  for (let i = 2; i <= sheet.dims[1]; i++) {
    let row = {};
    let cells = sheet.rows
    .filter(d => d.gs$cell.row == i)
    .map(d => d.gs$cell);
    
    sheet.headers.forEach( (d,i) => {
      row[sheet.headers[i]] = cells
            .filter(d => Number(d.col) == i + 1)
            .map(d => d.$t)[0]
    })
        
    rows.push(row);
  }
  
  return rows;
}

function getPresentations(data) {
  
  let presentations = [];

  let presentationIDs = [];
  for( row of data ) { presentationIDs.push(row.id) };
  presentationIDs = [...new Set(presentationIDs)];

  for (let i = 0; i < presentationIDs.length; i++) {
    presentations.push(data.filter( (d) => d.id === presentationIDs[i] ))
  }

  presentations = presentations.map( (d) => {
    let currPresentation = {};

    for (let i = 0; i < columns.length; i++){
      currPresentation[columns[i]] = [];
      for(row of d) { 
        if ( row[columns[i]] ) { 
          currPresentation[columns[i]].push(row[columns[i]])
        }
      }
      if( i < 6) { 
          currPresentation[columns[i]] = currPresentation[columns[i]][0] 
      }
    }
    currPresentation.presenters = getPresenters(currPresentation);
    currPresentation.links = getLinks(currPresentation);

    return currPresentation;
  });

  return presentations;
}

function getSessions(presentations) {
  let sessions = [];

  let sessionTitles = [];
  for ( presentation of presentations ) { 
    sessionTitles.push(presentation.session_title); 
  }
  sessionTitles = [...new Set(sessionTitles)];

  for( title of sessionTitles) {
    sessions.push(presentations.filter( e => e.session_title == title));
  }

  return sessions;
}

function getPresenters(currSession) {
  let currPresenters = [];

  currSession.presenter_name.forEach( (v,i) => {
    let currPresenter  = {};
    currPresenter.name = v;

    currPresenter.affiliation = (currSession.presenter_affiliation[i]) ?
      currSession.presenter_affiliation[i] : null;
    currPresenter.url = (currSession.presenter_url[i]) ?
      currSession.presenter_affiliation[i] : null;
    currPresenters.push(currPresenter);
  });

  return currPresenters;
}

function getLinks(currSession) {
  let currLinks = [];
  for (link of currSession.presentation_supplemental_link) { 
    currLinks.push(link)
  } 

  return currLinks;
}

$(function(){

  $.getJSON(`https://spreadsheets.google.com/feeds/cells/${gsheetID}/${gsheetSheetNum}/public/full?alt=json`, 
    (d) => { data = parseGoogleSheetsJSONFeed(d) })
    .then( () => {

      let presentations = getPresentations(data);
      let sessions = getSessions(presentations);
      let currDay = 14;

      $schedule.each( (i,e) => {  
        let $el = $(e);

        let daySessions = sessions.filter( 
          d => d[0].session_id.substring(0,2) == currDay + i
        );
        daySessions.forEach( (v,i) => {
          let presenters = [];
          for (presentation of v) { 
           for (presenter of presentation.presenters) {
             presenters.push(presenter.name)
           }
          }
          let session = `<div><h4>${v[0].session_title}</h4>${presenters.join(' • ')}</div>`

          $el.append(session);
        })

      });

    });
});