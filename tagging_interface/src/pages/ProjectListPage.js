import React from 'react';
import {Component} from 'react';
import { Link } from 'react-router-dom'
import formatDate  from '../functions/formatDate';


// Config for all API fetch requests
const fetchConfigGET = {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};



class ProjectsTable extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (<div></div>)




  }
}

class ProjectListPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: {
        projects: this.getDummyProjects(),
        numUserInvolvedIn: null,
        numCreatedByUser: null,       
      },
      view: "All projects", // "All projects" or "Your projects"
      loading: true,

    }
  }

  // Get some dummy projects for the first load, so that the table looks nice.
  getDummyProjects() {

    function randomString(minLength, maxLength) {
      var result = '';
      var randomLength = minLength + Math.floor(Math.random() * (maxLength - minLength))
      for(var i = 0; i < randomLength; i++ ) {
        result += 'x'
      }
      return result;
    }

    function randomName() {
      return randomString(5, 20);
    }

    function randomDesc() {
      var x = Math.random();
      if(x < 0.5) return null;
      return randomString(20, 50);
    }

    var dummyProjects = [];
    for(var i = 0; i < 10; i++) {
      dummyProjects.push({
        name:         randomName(),
        description:  randomDesc(),
        total_users:  0,
        created_at:   null,
        icon_name:    "",
      })
    }
    return dummyProjects;
  }

  // Query the API when this component is mounted.
  // Once done, set this.state.data to the returned projects, numUserInvolvedIn, and numCreatedByUser.
  componentWillMount() {
    fetch('http://localhost:3000/projects', fetchConfigGET) // TODO: move localhost out
      .then(response => response.text())
      .then((data) => {
        console.log(data);
        var d = JSON.parse(data);

        this.setState({
          data: d,
          loading: false
        })
      });
  }

  // Set this component's view to the specified view.
  // Should be either "All projects" or "Your projects".
  setView(view) {
    this.setState({
      view: view,
      loading: true,
      
    }, () => {
      window.setTimeout( () => {
        this.setState({
          
          loading: false,
        })
      }, 100); // Simulate lag ?

    })
  }



  render() {
    return (
      <div id="projects-table-wrapper">

        <div id="projects-table-header">            
          <div className={"row-button" + (this.state.view === "All projects"  ? " active" : "")} onClick={ () => this.setView('All projects') }>All projects <span className="counter">{ this.state.data.numUserInvolvedIn }</span></div>
          <div className={"row-button" + (this.state.view === "Your projects" ? " active" : "")} onClick={ () =>  this.setView('Your projects') }>Your projects <span className="counter">{ this.state.data.numCreatedByUser }</span></div>
        </div>

        <div id="projects-table" className={this.state.loading ? "loading" : ""}>
        
        { this.state.data.projects.filter(project => (this.state.view === "Your projects" ? project.userIsCreator : true)).map((project, i) => 
          
            <div className="row" index={i}>
              <div className="col-name-desc">
                <div className="project-icon"><div className="inner">{ project.icon_name }</div></div>
                <div className="name-desc-row">
                  <div className="project-name"><Link to={'/projects/' + project._id + '/dashboard'}>{ project.name}</Link></div>
                  {project.description && <div className="project-description">{ project.description }</div> }
                  <div className="project-creator">Created by <span className="creator-name">{ project.creator }</span></div>
                </div>
              </div>
              <div className="col-date">
                <span className="project-created-at">Created on {formatDate(project.created_at)}</span>
              </div>
              <div className="col-users">
                <span className="project-total-users"><i class="fa fa-user"></i> <span className="user-count">{project.total_users}</span></span>
              </div>
            </div>      
          )
        }
        </div>
      </div>  
    )
  }
}


export default ProjectListPage;