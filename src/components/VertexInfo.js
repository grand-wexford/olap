import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Tabs from 'react-md/lib/Tabs/Tabs';
import Tab from 'react-md/lib/Tabs/Tab';
import TabsContainer from 'react-md/lib/Tabs/TabsContainer';
import Slider from 'react-md/lib/Sliders';
import LinearProgress from 'react-md/lib/Progress/LinearProgress';
import Card from 'react-md/lib/Cards/Card';
import FontIcon from 'react-md/lib/FontIcons';
import CardText from 'react-md/lib/Cards/CardText';
import InfoTable from './InfoTable';
import { C, CREATE_API_URL } from '../constants';

export default class VertexInfo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTabIndex: 0,
      tabTwoChildren: null,
      vertexStatus: "calm",
      tableExpanded: false,
      textExpanded: false
    };
    this.handleTabChange = this.handleTabChange.bind(this);
  }

  static get propTypes() {
    return {
      onVertexTableReady: PropTypes.func,
      activeVertex: PropTypes.object,
      moduleId: PropTypes.number
    };
  }

  static get defaultProps() {
    return {
      activeVertex: null,
      moduleId: null
    };
  }

  componentWillUnmount() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
  }

  componentDidUpdate(prevProps, prevStates) {
    if (this.props.activeVertex !== prevProps.activeVertex) {
      if (this.props.activeVertex === null) {
        this.setState({ ...this.state, vertexStatus: "calm" });
      } else {
        this.getVertexInfo();
      }
    }
    if (this.state.vertexStatus !== prevStates.vertexStatus) {
      this.props.onVertexTableReady();
    }
  }

  shouldComponentUpdate(prevProps, prevStates) {
    if (this.props.activeVertex !== prevProps.activeVertex || this.props.moduleId !== prevProps.moduleId) {
      return true;
    }

    if (this.state.vertexStatus !== prevStates.vertexStatus || this.state.tableExpanded !== prevStates.tableExpanded || this.state.textExpanded !== prevStates.textExpanded) {
      return true;
    }

    return false;
  }

  componentDidMount() {

  }

  getVertexInfo = () => {
    // C('getVertexInfo', vertex1, vertex2);
    this.setState({
      ...this.state,
      appStatus: "loading",
      vertexInfo: {},
      vertexStatus: "loading"
    });
    const query = this.props.activeVertex;

    fetch(CREATE_API_URL({ moduleId: this.props.moduleId, command: 'onInfoTable', query }), { method: 'GET' })
      .then(response => {
        this.setState({ ...this.state, appStatus: 'loaded' });
        return response.json();
      })
      .then(data => {
        if (data.result === "success") {
          if (data.params) {
            this.setState({
              ...this.state,
              vertexInfo: data.params,
              vertexStatus: "loaded"
            });
          }
        } else {
          this.setState({ ...this.state, appStatus: `error: ${data.params}` });
        }
      })
      .catch(response => this.setState({ ...this.state, appStatus: 'error', lastError: response }));
  }

  handlerExpandTable = () => this.setState({ ...this.state, tableExpanded: !this.state.tableExpanded });
  handlerExpandText = () => this.setState({ ...this.state, textExpanded: !this.state.textExpanded });

  handleTabChange(activeTabIndex) {
    if (activeTabIndex === 1 && !this.state.tabTwoChildren) {
      // Fake async loading
      this._timeout = setTimeout(() => {
        this._timeout = null;

        this.setState({
          ...this.state,
          tabTwoChildren:
          <Slider id="slider" defaultValue={30} key="slider" className="md-cell md-cell--12" />,
        });
      }, 3000);
    }
    this.setState({ activeTabIndex });
  }

  render() {
    const { activeTabIndex, tableExpanded, textExpanded, vertexStatus, vertexInfo } = this.state;

    let classTableExpanded = tableExpanded ? 'table-expanded' : '';
    let classTextExpanded = textExpanded ? 'text-expanded' : 'text-collapsed';
    let active = vertexStatus !== "calm" ? '' : 'hidden';

    return <Card className={`md-cell md-cell--12 ${classTableExpanded} ${classTextExpanded} ${active}`}>
      <CardText className="table-holder">
        <div className="display-control-holder">
          <FontIcon onClick={this.handlerExpandTable}>{tableExpanded ? 'fullscreen_exit' : 'fullscreen'}</FontIcon>
          <FontIcon onClick={this.handlerExpandText}>{textExpanded ? 'title' : 'format_strikethrough'}</FontIcon>
        </div>
        <i className="clear"></i>
        {vertexStatus === "loading" && <LinearProgress id={'loading-vertex'} />}
        {vertexStatus === "loaded" && <TabsContainer onTabChange={this.handleTabChange} activeTabIndex={activeTabIndex} panelClassName="md-grid" colored>
          <Tabs tabId="tab">
            {vertexInfo && vertexInfo.tableData && vertexInfo.tableData.map((v, i) =>
              <Tab label={v.tabName} key={i}>
                <InfoTable tabData={v} />
              </Tab>
            )}
          </Tabs>
        </TabsContainer>}
      </CardText>
    </Card>;
  }
}