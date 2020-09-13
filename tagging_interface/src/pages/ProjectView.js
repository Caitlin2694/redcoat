import React from 'react';
import {Component} from 'react';
import { PieChart } from 'react-minimal-pie-chart';
import { Redirect, Link, BrowserRouter, Route, Switch, withRouter } from 'react-router-dom'
import { TransitionGroup, CSSTransition } from "react-transition-group";
import Error404Page from '../pages/Error404Page';
import {Bar, Line, HorizontalBar } from 'react-chartjs-2';

import { defaults } from 'react-chartjs-2'

import { Comment } from '../components/Comment';

import _ from 'underscore';

defaults.global.defaultFontFamily = 'Open Sans'
defaults.global.animation.duration = 500;

// Config for all API fetch requests
const fetchConfigGET = {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};


const chartColours = [
"#36A2EB",
"#FF6384",
"#6dc922",
"#B4436C",
"#FFCE56",
"#F78154",
"#5FAD56",
"#4D9078",
"#586BA4",
"#324376",
"#F5DD90",
"#6665DD",
"#7B4B94",
];


// Couldn't find a good component for this online so I made my own. It visualises the 'annotations per doc' in the form of a 
// waffle chart, which looks more or less like a heat map but without any labels. The data should be ordered in descending freq
// of number of annotations.
class WaffleChart extends Component {
  constructor(props) {
    super(props);
  }



  render() {
    var maxValue = this.props.data.length - 1;

    var total = this.props.data.reduce((a, b) => a + b, 0);
    var ratio = Math.min(100, total) / total;

    var tooltips = [];

    var tooltipSide = -1;
    var rowIdx = 0;

    var data = this.props.data.reverse(); // Reverse the order so that the docs annotated more are on top

    // Calculate the tooltip positions
    var totalSquares = 0;
    for(var i in this.props.data) {

      var count = this.props.data[i];
      var squares = Math.ceil(count * ratio);

      tooltips.push(
        <span style={{'top': (Math.ceil(totalSquares / 10) * 19) + 'px'}} className={"waffle-chart-tooltip tooltip-" + (tooltipSide === 1 ? "right" : "left")}>

          <b style={{'background': 'rgba(54, 162, 235,' + Math.max(0.1, ((maxValue - i) / maxValue)) + ')'}}>
            {(maxValue - i === 0) ? "Not yet annotated" : ((maxValue - i) + " annotation" + (maxValue - i === 1 ? '' : 's'))}
          </b>
          <span className="num-docs">{this.props.data[i]} docs</span>
        </span>
      );

      tooltipSide *= -1;

      rowIdx += Math.floor(squares / 10) + 1;
      totalSquares += squares;
      
    }


    return (
      <div className="waffle-chart-container">
        <div className="waffle-chart-legend">
          <span>{maxValue}</span>
          <div className="waffle-chart-legend-inner"></div>
          <span>0</span>


        </div>
        <div className="waffle-chart" id="annotations-per-doc-chart">
          <div className="waffle-chart-squares">
            { this.props.data.map((frequency, groupIndex) => {

              var value = maxValue - groupIndex;

              return new Array(Math.ceil(frequency * ratio)).fill(0).map((square, squareIndex) => {
                return (
                  <div className="waffle-square" style={
                    {'background': 'rgba(54, 162, 235,' + Math.max(0.1, ((value) / maxValue)) + ')'}}>
                    { value }
                  </div>
                )
              }
              )}
            )}
          </div>
          <div className="waffle-chart-info">1 square = ~{ Math.ceil(1 / ratio) } documents</div> 
          <div className="waffle-chart-tooltips">{ tooltips }</div>
        </div>    


      </div>

      )
  }
}


// Returns a JSON array of styles for the entity chart.
function getEntityChartStyles() {
  return {
    backgroundColor: 'rgba(54, 162, 235, 0.6)',
    borderColor: 'rgba(54, 162, 235, 0.6)',
    borderWidth: 1,
    hoverBackgroundColor: 'rgba(54, 162, 235, 0.6)',
    hoverBorderColor: 'rgba(54, 162, 235, 0.6)',
  }
}


// https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Set the styles of the activity chart data.
function setActivityChartStyles(activityChartData) {

  for(var i in activityChartData.datasets) {
    var colourIdx = parseInt(i) % chartColours.length;
    activityChartData.datasets[i] = Object.assign({}, activityChartData.datasets[i], {
      fill: false,
      lineTension: 0.1,
      backgroundColor: chartColours[colourIdx],
      borderColor: chartColours[colourIdx],
      borderCapStyle: 'square',
      borderDash: [],
      borderDashOffset: 0.0,
      borderJoinStyle: 'bevel',
      pointBorderColor: chartColours[colourIdx],
      pointBackgroundColor: chartColours[colourIdx],
      pointBorderWidth: 3,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: chartColours[colourIdx],
      pointHoverBorderColor: 'rgba(220,220,220,1)',
      pointHoverBorderWidth: 2,
      pointRadius: 1,
      pointHitRadius: 10,
      lineTension: 0,
    })

  }
  return activityChartData;
}



// hex to RGB code found here: https://convertingcolors.com/blog/article/convert_hex_to_rgb_with_javascript.html
String.prototype.convertToRGB = function(){
    if(this.length != 6){
        throw "Only six-digit hex colors are allowed.";
    }

    var aRgbHex = this.match(/.{1,2}/g);
    var aRgb = [
        parseInt(aRgbHex[0], 16),
        parseInt(aRgbHex[1], 16),
        parseInt(aRgbHex[2], 16)
    ];
    return aRgb;
}

// Simple function to darken an RGB array.
function darken(colourRGB, amount) {
  return [Math.max(colourRGB[0] - amount, 0), Math.max(colourRGB[1] - amount, 0), Math.max(colourRGB[2] - amount, 0)]
}


// The project dashboard, which renders in the container to the right of the navigation.
// Its data comes from props, not state (so that the dashboard doesn't need to be reloaded when switching between
// pages in the Project view).
class ProjectDashboard extends Component {
  constructor(props) {
    super(props);    
    this.state = {
      entityChartMulticolour: false,
      activityChartCumulative: false,
    }
  }


  toggleEntityChartColours() {
    this.setState({
      entityChartMulticolour: !this.state.entityChartMulticolour
    });
  }

  toggleActivityChartCumulative() {
    this.setState({
      activityChartCumulative: !this.state.activityChartCumulative
    });
  }

  // Apply colouring to entityChartData if entityChartMulticolour is true.
  getColouredData() {

    const entityColours = ["#99FFCC", "#FFCCCC", "#CCCCFF", "#CCFF99", "#CCFFCC", "#CCFFFF", "#FFCC99", "#FFCCFF", "#FFFF99", "#FFFFCC", "#CCCC99", "#fbafff"];


    console.log(this.props.data.entityChartData.entityClasses, "<<")
    var entityChartData = this.props.data.entityChartData;

    entityChartData.entityClasses.datasets[0].borderWidth = 1;
   
    if(this.state.entityChartMulticolour) {

      entityChartData.entityClasses.datasets[0].backgroundColor = [];
      entityChartData.entityClasses.datasets[0].borderColor = [];
      

      for(var i in this.props.data.entityChartData.entityClasses.labels) {
        var label = this.props.data.entityChartData.entityClasses.labels[i];
        var colourIdx = this.props.data.entityChartData.colourIndexes[label];

        console.log(colourIdx, label);
        var colourHex = entityColours[colourIdx % entityColours.length];

        console.log(colourHex);
        var colourRGB = colourHex.slice(1, 7).convertToRGB();

        entityChartData.entityClasses.datasets[0].backgroundColor.push('rgba(' + colourRGB[0] + ', ' + colourRGB[1] + ', ' + colourRGB[2] + ', 1)');

        var colourRGBBorder = darken(colourRGB, 50);
        entityChartData.entityClasses.datasets[0].borderColor.push('rgba(' + colourRGBBorder[0] + ', ' + colourRGBBorder[1] + ', ' + colourRGBBorder[2] + ', 1)');
      }

    } else {
      entityChartData.entityClasses.datasets[0].backgroundColor = 'rgba(54, 162, 235, 0.6)';      
      entityChartData.entityClasses.datasets[0].borderColor = 'rgba(54, 162, 235, 0.6)';      
    }    

    
    return entityChartData.entityClasses;
  }


  // Process the activity chart data depending on whether cumulative has been checked.
  processActivityChartData() {

    // Transform datasets into cumulative datasets.
    // This is probably far more complicated than it needs to be and could be significantly refactored.
    // Turns out chartjs has a 'redraw' prop that would solve all the issues I was having, so all this weird code is probably unnecessary...
    // Same goes for getColouredData.
    function getCumulative(datasets) {
      var cumulativeDatasets = [];
      for(var i = 0; i < datasets.length; i++) {

        var label = datasets[i].label;
        var cumulativeDataset = {label: label, data: new Array(datasets[i].data.length).fill(0)};

        var c = 0;
        for(var j = datasets[i].data.length - 1; j >= 0; j--) {
          c += datasets[i].data[j];
          cumulativeDataset.data[j] = c;
        }
        console.log(cumulativeDataset, ">>");
        cumulativeDatasets.push(cumulativeDataset);
      }
      return cumulativeDatasets;
    }

    var activityChartDatasets = Object.assign({}, this.props.data.activityChartData.datasets);

    if(this.state.activityChartCumulative) {
      console.log(this.props.data.activityChartData, "<<");

      var cumulativeData = getCumulative(this.props.data.activityChartData.datasets);

      var cumulative = setActivityChartStyles({
        labels: Object.assign([], this.props.data.activityChartData.labels),
        datasets: cumulativeData,
      })
      return cumulative;
    }

    return this.props.data.activityChartData;
  }


  render() {


    // var heatmapData = new Array(198).fill(3);
    // var h1 = new Array(200).fill(2)
    // var h2 = new Array(200).fill(1)
    // var h3 = new Array(200).fill(0)
    // heatmapData = heatmapData.concat(h1);
    // heatmapData = heatmapData.concat(h2);
    // heatmapData = heatmapData.concat(h3);

    //heatmapData = heatmapData.map(() => Math.random())
    return (
     
      <div id="project-dashboard" className={(this.props.loading ? "loading" : "")}>
        <div className="dashboard-top-row">
        <div className="dashboard-key-items">
          <div className="dashboard-item">
            <div className="flex-wrapper">



              <div>
                <div className="name"># Annotated</div>
                <div className="value"><span class="st st-darker">{ numberWithCommas(this.props.data.numDocGroupsAnnotated) } / { numberWithCommas(this.props.data.totalDocGroups) }</span></div>
              </div>

              <div class="pieChart">

                { this.props.loading && 
                <PieChart
                  data={[
                    { value: 0, color: "rgb(109, 201, 34)"},
                    { value: 1, color: "rgba(0, 0, 0, 0)"}, // sneaky 
                  ]}
                  background={"#d5d5d5"}
                  lineWidth={18}
                  startAngle={270}
                />
                }
                { !this.props.loading && 
                  <PieChart
                  data={[
                    { value: (this.props.data.numDocGroupsAnnotated), color: "rgb(109, 201, 34)"},
                    { value: (this.props.data.totalDocGroups - this.props.data.numDocGroupsAnnotated), color: "rgba(0, 0, 0, 0)"}, // sneaky 
                  ]}
                  background={"#d5d5d5"}
                  animate={true}
                  animationDuration={500}
                  lineWidth={18}
                  startAngle={270}
                />
                }



              </div>
            </div>

          </div>
          <div className="dashboard-item">
            <div className="name">Avg. agreement<span className="information" title="Average agreement is only calculated for documents with more than one annotation."><i class="fa fa-info-circle"></i></span></div>
            <div className="value"><span class="st st-darker"> { this.props.data.avgAgreement ? (Math.round(this.props.data.avgAgreement * 100) + "%") : "--"} </span></div>
          </div>
          <div className="dashboard-item">
            <div className="name">Avg. time per document</div>
            <div className="value"><span class="st st-darker">{ this.props.data.avgTimePerDocument } seconds</span></div>
          </div>
          </div>

          <Link to={"/projects/" + this.props.project_id + "/tagging"} className="annotate-button"><i class="fa fa-pencil"></i>Annotate<div className="subtitle">{this.props.data.userDocsAnnotated}/{this.props.data.userAnnotationsRequired} complete</div></Link>

        </div>



        <div className="dashboard-white-boxes">


          <div className="dashboard-wrapper-item col-60">



            <div className="dashboard-item col-100">
              <div className="inner">
                <div className="dashboard-flex-header">
                  <h3>Entity frequencies</h3>
                  { this.props.data.entityChartData && <div onClick={this.toggleEntityChartColours.bind(this)} className={"chart-option" + (this.state.entityChartMulticolour ? " active" : "")}><span className="checkbox"></span><span>Colour by class</span></div> }
                </div>
                <div>
                  { this.props.loading && 
                    <div className="chart-placeholder"><i class="fa fa-cog fa-spin"></i>Loading...</div>
                  }
                  { !this.props.loading && !this.props.data.entityChartData && <div className="chart-placeholder chart-not-available">This project does not have any annotations yet.</div>}
                  { !this.props.loading && this.props.data.entityChartData &&
                  <Bar
                    data={this.getColouredData()}
                    height={230}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      legend: {
                        display: false
                      },
                      scales: {
                        yAxes: [{
                          ticks: {
                            beginAtZero: true,
                            precision: 0
                            
                          },
                          scaleLabel: {
                            display: true,
                            labelString: "Frequency"
                          }
                        }]
                      },
                    }}
                  />}


                </div>
              </div>
            </div>

            <div className="dashboard-item col-60">
              <div className="inner">
                <div className="dashboard-flex-header">
                  <h3>Activity</h3>
                  { this.props.data.activityChartData && <div onClick={this.toggleActivityChartCumulative.bind(this)} className={"chart-option" + (this.state.activityChartCumulative ? " active" : "")}><span className="checkbox"></span><span>Cumulative</span></div> }
                </div>
                <div>
                  { this.props.loading && 
                    <div className="chart-placeholder"><i class="fa fa-cog fa-spin"></i>Loading...</div>
                  }
                  { !this.props.loading && !this.props.data.activityChartData && <div className="chart-placeholder chart-not-available">This project does not have any activity yet.</div>}
                  { !this.props.loading &&  this.props.data.activityChartData &&
                  <Line
                    data={() => this.processActivityChartData()}
                    height={230}
                    redraw
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        xAxes: [{
                          type: 'time',
                          time: {
                            unit: 'day',
                          },
                          ticks: {
                            max: new Date()
                          }
                        }],
                        yAxes: [{
                          ticks: {
                            beginAtZero: true,
                            precision: 0
                            
                          },
                          scaleLabel: {
                            display: true,
                            labelString: "Annotations"
                          }
                        }]
                      }
                    }}/>
                  }
                </div>
              </div>
            </div>

            

            <div className="dashboard-item col-40">
              <div className="inner">
                <h3>Annotations/document</h3>
                { this.props.loading && 
                  <div className="chart-placeholder"><i class="fa fa-cog fa-spin"></i>Loading...</div>
                }
                { !this.props.loading && 
                  <WaffleChart data={this.props.data.annotationsChartData}/>
                }
              </div>
            </div>
          </div>

        


        <div className="dashboard-item col-40 double-height">
          <div className="inner">
            <h3>Comments</h3>

            <div className={"comments-wrapper" + (this.props.data.comments.length === 0 ? " no-comments": "")}>       

              { this.props.data.comments.length === 0 && <div className="no-comments">This project does not have any comments yet.</div>}       

              { this.props.data.comments.map((comment, i) => <Comment index={i} {...comment} />) }

            </div>
          </div>
        </div>

          
        </div>


      </div>    
      
    )
  }
}



class ProjectViewSidenav extends Component {
  constructor(props) {
    super(props);
  }



  render() {
    /* old 
    <div className="project-card">
      <div className="circle-icon"><div className="inner">PO</div></div>
      <div>
        <div className="project-name">Project one</div>
        <div className="project-creator">Created by <span className="creator-name">someone</span></div>
      </div>
    </div>



    <div className="go-back"><Link to="/projects"><i class="fa fa-chevron-left"></i>Projects</Link></div>

    */

    var currentLocation = window.location.pathname;
    var view = currentLocation.split('/')[currentLocation.split('/').length - 1];

    return (
      <nav id="project-view-sidenav">
        <div className="project-card">
          <div>
            <div className={"project-name" + (!this.props.projectTitle ? " st" : "")} style={{'display': 'block'}}><Link to={"/projects/" + this.props.project_id + "/dashboard"}>{this.props.projectTitle ? this.props.projectTitle : "xxxxxxxx"}</Link></div>
            <div className={"project-creator" + (!this.props.projectAuthor ? " st" : "")} style={{'display': 'block'}}>Created by <span className="creator-name">{this.props.projectAuthor ? this.props.projectAuthor : "xxxxxxxx"}</span></div>
          </div>
        </div>

        <ul className="sidenav-items">
          <ProjectViewSidenavButton project_id={this.props.project_id} view={view} name="Dashboard" icon="bar-chart"/>
          <ProjectViewSidenavButton project_id={this.props.project_id} view={view} name="Curation" icon="list-alt"/>
          <ProjectViewSidenavButton project_id={this.props.project_id} view={view} name="Category hierarchy" icon="sitemap"/>
          <ProjectViewSidenavButton project_id={this.props.project_id} view={view} name="Invitations" icon="envelope"/>
          <ProjectViewSidenavButton project_id={this.props.project_id} view={view} name="Settings" icon="wrench"/>
        </ul>

      </nav>
    )
  }
}

class ProjectViewSidenavButton extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    var pathName = this.props.name.replace(" ", "-").toLowerCase();
    return (
      <li className={this.props.view === pathName ? "active" : ""}>
        <Link to={"/projects/" + this.props.project_id + "/" + pathName}>
        <i className={"fa fa-" + this.props.icon}></i>{ this.props.name }
        </Link>


      </li>
    )
  }
}

class EmptyThing extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return ( <div>This page is still a work in progress!</div> )
  }
}

class ProjectView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,

      data: {

        dashboard: {

          userDocsAnnotated: 0,
          userAnnotationsRequired: 0,

          numDocGroupsAnnotated: 999,
          totalDocGroups: 9999,

          avgAgreement: 0.5,

          avgTimePerDocument: 15,

          // Note that the comments below are just placeholders. I should probably generate a function to make these automatically
          // These will be skeleton screens on the comments div
          comments: [
            {
              author: "Mr Pingu",
              date: "4 Sept",
              text: "Noot noot! I don't know what this is",
              document_string: "one two three four five six seven ",
              user_profile_icon: {
                foreground: "#eee",
                background: "#eee",
                icon: "fa-user",
              }
            },
            {
              author: "Mrs Pingu",
              date: "3 Sept",
              text: "This doesn't make sense",
              document_string: "one two three four five six seven one two three four five six seven one two three four five six seven ",
              user_profile_icon: {
                foreground: "#eee",
                background: "#eee",
                icon: "fa-user",
              }
            },
            {
              author: "Michael",
              date: "1 Sept",
              text: "Not sure what a flange is",
              document_string: "one two three four five six seven one two three four five six seven ",
              user_profile_icon: {
                foreground: "#eee",
                background: "#eee",
                icon: "fa-user",
              }
            },
            {
              author: "Michael",
              date: "1 Sept",
              text: "I sure hope these never get rendered",
              document_string: "one two three four five six seven ",
              user_profile_icon: {
                foreground: "#eee",
                background: "#eee",
                icon: "fa-user",
              }
            },
            {
              author: "Borat",
              date: "1 Sept",
              text: "very nice",
              document_string: "one two three four five six seven one two three four five six seven ",
              user_profile_icon: {
                foreground: "#eee",
                background: "#eee",
                icon: "fa-user",
              }
            }
          ],
        }        
      }   
    }
  }

  componentWillMount() {
    var t = this;

    fetch('http://localhost:3000/projects/' + this.props.project_id, fetchConfigGET) // TODO: move localhost out
      .then(response => response.text())
      .then((data) => {
        console.log(data, "<<<");
        var d = JSON.parse(data);

        window.setTimeout(() => {

          // Add the chart styles here in the front-end
          //var entityChartData = d.dashboard.entityChartData.entityClasses   //.datasets[0], getEntityChartStyles())
          //d.dashboard.entityChartData.entityClasses.datasets[0] = entityChartData;

          if(d.dashboard.activityChartData) d.dashboard.activityChartData = setActivityChartStyles(d.dashboard.activityChartData);

          console.log(d);


          t.setState({
            loading: false,
            data: d,
            
          }, () => { this.props.setProject(d.project_name, d.project_author); console.log(this.state.data.dashboard.entityChartData)} );
      }, 555);
    });




    
    // Query api for project

  }

  render() {
    var location = this.props.location;

    return (
      <div>
        <div id="project-view" className={this.state.loading ? "loading" : ""}>
          <ProjectViewSidenav view={this.state.view}
                              project_id={this.props.project_id}
                              projectTitle={this.props.projectTitle}
                              projectAuthor={this.props.projectAuthor}

                               />


          <div className="project-view-wrapper">
          <TransitionGroup className="transition-group">
          <CSSTransition
          key={location.key}
          timeout={{ enter: 400, exit:400 }}
          classNames="fade"
          >
          <section className={"route-section" + (!this.state.loading ? " loaded" : "")}>
           <Switch location={location}>
              <Route path="/projects/:id/dashboard"           render={() => <ProjectDashboard loading={this.state.loading} data={this.state.data.dashboard} project_id={this.props.project_id} />} />     
              <Route path="/projects/:id/curation"            render={() => <EmptyThing {...this.state} />} />     
              <Route path="/projects/:id/category-hierarchy"  render={() => <EmptyThing {...this.state} />} />     
              <Route path="/projects/:id/invitations"         render={() => <EmptyThing {...this.state} />} />     
              <Route path="/projects/:id/settings"            render={() => <EmptyThing {...this.state} />} />   
              <Route             render={() => <Error404Page />} />   
            </Switch>
          </section>
          </CSSTransition>
          </TransitionGroup>
          </div>
        
      

          


        </div>     
      </div>
    )
  }
}
// { currentView }

export default withRouter(ProjectView);