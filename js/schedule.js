// parse json from google sheet and render schedule html

const gsheetID = '1AiBjC9YapNJEHgHpqXvNOOVOZO_5h-KDaJQEmtz3jzI';
const gsheetSheetNum = '1';
const gSheetURL = `https://spreadsheets.google.com/feeds/cells/${gsheetID}/${gsheetSheetNum}/public/full?alt=json`
const confDayStart = 14;
const confLength = 3;
let columns = [];
let data = [];
let $schedule = $('#schedule-view div');

// take google sheet json feed and return row objects
// with column header keys
function parseGoogleSheetsJSONFeed(data) {
  const sheet = {};
  let rows = [];

  sheet.rows = data.feed.entry;
  sheet.cols = sheet.rows
      .filter( d => d.gs$cell.row == 1)
      .map( d => d.gs$cell.$t );
  sheet.numRows = Number(sheet.rows[sheet.rows.length - 1].gs$cell.row);

  columns = sheet.cols;

  for (let i = 2; i <= sheet.numRows; i++) {
    let row = {};
    let cells = sheet.rows
        .filter(d => d.gs$cell.row == i)
        .map(d => d.gs$cell);
    
    sheet.cols.forEach( (d,i) => {
      row[sheet.cols[i]] = cells
          .filter(d => Number(d.col) == i + 1)
          .map(d => d.$t)[0]
    })

    rows.push(row);
  }

  return rows;
}

// returns transformed row objects to schedule data organized
// by day, session, and presentation
function transformToSchedule(data){
  let daySessions = [];
  let presentations = getPresentations(data);
  let sessions = getSessions(presentations);
  for (let i = 0; i < confLength; i++ ){
    daySessions.push(
      sessions.filter( 
        d => d[0].session_id.substring(0,2) == confDayStart + i
    ));
  }
  return daySessions;
}

// return array of transformed unique presentations
function getPresentations(data) {
  let presentations = [];
  let presentationIDs = getUniqueKeys(data, 'id');

  function transformPresentation(presentation){
    let currPresentation = {};

    for (let column of columns){
      currPresentation[column] = [];
      for(row of presentation) { 
        if ( row[column] ) { 
          currPresentation[column].push(row[column])
        }
      }
      if( columns.indexOf(column) < 6) { 
          currPresentation[column] = currPresentation[column][0] 
      }
    }
    currPresentation.presenters = getPresenters(currPresentation);
    currPresentation.links = getLinks(currPresentation);

    return currPresentation;
  }

  for (let i of presentationIDs) {
    presentations.push( data.filter( (d) => d.id === i ) );
  }

  presentations = presentations.map( (d) => transformPresentation(d) );

  return presentations;
}

// return session array of presentation arrays
function getSessions(presentations) {
  let sessions = [];
  let sessionTitles = getUniqueKeys(presentations, 'session_title');

  for( title of sessionTitles) {
    sessions.push(presentations.filter( e => e.session_title == title));
  }

  return sessions;
}

// return array of presenters objects
function getPresenters(currSession) {
  let currPresenters = [];

  currSession.presenter_name.forEach( (v,i) => {
    let currPresenter  = {};
    currPresenter.name = v;

    currPresenter.affiliation = (currSession.presenter_affiliation[i]) ?
      currSession.presenter_affiliation[i] : null;
    currPresenter.url = (currSession.presenter_url[i]) ?
      currSession.presenter_url[i] : null;
    currPresenters.push(currPresenter);
  });

  return currPresenters;
}

// return array of transformed supplemental presentation links
function getLinks(currSession) {
  let currLinks = [];
  for (link of currSession.presentation_supplemental_link) { 
    currLinks.push(link)
  } 

  return currLinks;
}

// return array of uniqe keys
function getUniqueKeys(object, targetKey) {
  let uniqueKeys = [];
  for ( elem of object ) { 
    uniqueKeys.push(elem[targetKey]); 
  }
  return [...new Set(uniqueKeys)];
}

$(function(){

  $.getJSON( gSheetURL, (d) => { data = parseGoogleSheetsJSONFeed(d) })
    .then( () => {

      let scheduleData = transformToSchedule(data);

      // for each schedule day, append day, session, 
      // presentation information card and modal
      $schedule.each( (i,e) => {  

        scheduleData[i].forEach( (day) => {

          let currSessionInfo = [];
          let presenters = [];

          currSessionInfo.push(day[0].session_title);

          for (presentation of day) { 
            let currPresenters = [];
            for (presenter of presentation.presenters) {
              // modal presenter display string
              currPresenters.push(presenter.name + ', ' + presenter.affiliation);
              // card presenter display string
              presenters.push(presenter.name);
            }
          // modal presentation description display string
           let currPresentation = [];
           let displayTitle = (presentation.presentation_title) ?
            presentation.presentation_title :
            presentation.session_title;
           
            currPresentation.push(displayTitle);
            currPresentation.push(currPresenters.join('<br/>'));
            currPresentation.push(presentation.presenter_abstract);

            currSessionInfo.push(currPresentation)
          }

          // session card display html element
          let $session = $(`<a href="#session${day[0].session_id}" class="open-modal" rel="modal:open"></a>`);

          $session.append(`<h3>${day[0].session_title}</h3>${presenters.join(' • ')}</p>`);

          // session modal display html element
          let $sessionInfo = $(`<div id="session${day[0].session_id}" class="modal"><span><a href="#" rel="modal:close">Close</a><h4>${currSessionInfo.shift()}</h4></span></div>`);

          for (presentation of currSessionInfo) {
            $sessionInfo.append(`<h5>${presentation[0]}</h5`);
            $sessionInfo.append(`<p>${presentation[1]}</p`);
            $sessionInfo.append(`<p>${presentation[2]}</p`);
          }

          $session.append($sessionInfo);
          $(e).append($session);
        })
      });

      $('a.open-modal').click(function(event) {
        $(this).modal({ fadeDuration: 250 });
        return false;
      });
    });  
});