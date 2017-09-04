import React, { Component } from 'react';
import { TextField } from 'react-md';
import FontIcon from 'react-md/lib/FontIcons';
import Card from 'react-md/lib/Cards/Card';
import CardTitle from 'react-md/lib/Cards/CardTitle';
import Button from 'react-md/lib/Buttons';
import CardText from 'react-md/lib/Cards/CardText';
import SelectField from 'react-md/lib/SelectFields';
import { C, CREATE_API_URL } from './constants';
import { Graph } from 'gw-react-d3-graph';
import { connect } from 'react-redux';
import LinearProgress from 'react-md/lib/Progress/LinearProgress';

// import {c} from './globals';

import GraphMap from './components/GraphMap';
import VertexInfo from './components/VertexInfo';

const menu = [
  {
    value: 1001,
    label: "Модуль 1001"
  },
  {
    value: 1002,
    label: "Модуль 1002"
  }
];

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      appStatus: "calm",
      searchText: "IVANOV",
      moduleId: null,
      graph: { nodes: [], links: [] },
      activeVertex: null,
      filtersCard: true,
      graphExpanded: false,
      width: 800,
      height: 600,
      coef: 1
    };
  }

  componentDidMount = () => {
    C('componentDidMount');

    window.addEventListener('resize', () => this.setState({ ...this.state, ...this.getWrapperSize() }));
    this.setState({ ...this.state, ...this.getWrapperSize() });
  }

  componentDidUpdate(prevProps, prevState) {
    C('componentDidUpdate');
    if (prevState.moduleId !== this.state.moduleId) {
      this.initModule();
    }

    if (this.state.graphExpanded !== prevState.graphExpanded) {
      this.setState({ ...this.state, ...this.getWrapperSize() });
    }
  }

  shouldComponentUpdate = (prevProps, prevState) => {
    if (prevState !== this.state.graphExpanded || prevState.coef !== this.state.coef || prevState.moduleId !== this.state.moduleId || prevState.graph !== this.state.graph || prevState.searchText !== this.state.searchText || prevState.width !== this.state.width || prevState.height !== this.state.height) {
      return true;
    }
    return false;
  }

  getWrapperSize = () => {
    let wrapper = document.querySelector('#graph-id-graph-wrapper');

    return {
      width: wrapper.clientWidth,
      height: wrapper.clientHeight
    };
  }

  convertGraph = (graph, coef) => ({
    ...graph,
    nodes: graph.nodes.map(k => ({
      ...k,
      image: k.group,
      // type: 'circle',
      size: Math.round(40 * coef),
      fontSize: 10 * coef
    })),
    links: graph.links.map(k => ({
      ...k,
      source: graph.nodes[k.source].id,
      target: graph.nodes[k.target].id
    }))
  })

  setPercent = (k) => {
    C('setPercent');

    k *= this.state.coef;
    if (k > 0.01) {
      return Math.round(k * 100);
    }
    return Math.round(k * 10000) / 100;
  }

  initModule = () => {
    fetch(CREATE_API_URL({ moduleId: this.state.moduleId, command: 'onInit', query: { width: this.state.width, height: this.state.height } }), { method: 'GET' })
      .then(response => {
        this.setState({ ...this.state, appStatus: 'loaded' });
        return response.json();
      })
      .then(data => {
        if (data.result !== "success") {
          this.setState({ ...this.state, appStatus: `error: ${data.params}` });
        }
      })
      .catch(response => this.setState({ ...this.state, appStatus: 'error', lastError: response }));
  }

  handlerClearText = () => this.setState({ ...this.state, searchText: "" });
  handlerChangeText = e => this.setState({ ...this.state, searchText: e });
  handlerChangeType = value => this.setState({ ...this.state, moduleId: value, appStatus: 'loading' });
  handlerClickNode = nodeId => this.setState({ ...this.state, activeVertex: { vertex1: nodeId } });
  handlerClickLink = (source, target) => this.setState({ ...this.state, activeVertex: { vertex1: source, vertex2: target } });
  handlerZoomed = transform => this.setState({ ...this.state, percent: this.setPercent(transform.k) });
  handlerVertexTableReady = () => this.setState({ ...this.state, ...this.getWrapperSize() });
  handlerExpandGraph = () => this.setState({ ...this.state, graphExpanded: !this.state.graphExpanded, filtersCard: !this.state.filtersCard });

  handlerSubmitForm = e => {
    e.preventDefault();

    if (!this.state.moduleId || !this.state.searchText) {
      return false;
    }

    this.setState({
      ...this.state,
      appStatus: "loading",
      graph: { nodes: [], links: [] },
      activeVertex: null,
      coef: 1
    });

    fetch(CREATE_API_URL({ moduleId: this.state.moduleId, command: 'onFiltered', query: { text: this.state.searchText } }), { method: 'GET' })
      .then(response => {
        this.setState({ ...this.state, appStatus: 'loaded' });
        return response.json();
      })
      .then(data => {
        if (data.result === "success") {
          if (data.params && data.params.graph) {
            this.setState({
              ...this.state,
              coef: data.params.scaleCoef,
              graph: this.convertGraph(data.params.graph, data.params.scaleCoef),
              percent: this.setPercent(data.params.scaleCoef)
            });
          }
        } else {
          this.setState({ ...this.state, appStatus: `error: ${data.params}` });
        }
      })
      .catch(response => this.setState({ ...this.state, appStatus: 'error', lastError: response }));
  }

  handlerMouseOverNode = (nodeId) => {
    C('Mouse over node', nodeId);
  }

  handlerMouseOutNode = (nodeId) => {
    C('Mouse out node', nodeId);
  }

  render() {
    const myConfig = {
      highlightBehavior: true,
      width: this.state.width,
      height: this.state.height,
      minZoom: 0.05,
      maxZoom: 8,
      zoomOutButton: '.js-zoom-out',
      zoomInButton: '.js-zoom-in',
      node: {
        color: '#afffdf',
        imagePath: "d3test/i/",
        size: '40',
        fontSize: '10',
        highlightFontSize: '10',
        labelProperty: "name",
        // renderLabel: false,
        highlightStrokeColor: '#3e588f'
      },
      link: {
        highlightColor: '#6acafc',
        strokeWidth: "1"
      }
    };
    const { graphExpanded, graph, percent, appStatus, searchText, moduleId, activeVertex, filtersCard } = this.state;

    let classGraphExpanded = graphExpanded === true ? '12' : '8';
    let classfiltersCard = filtersCard ? '' : 'hidden';

    return (
      <div className="App md-grid">
        <Card className={`md-cell md-cell--${classGraphExpanded}`} style={{ zIndex: 2, position: "relative" }}>
          <GraphMap
            isInit={!!graph.nodes.length}
            percent={percent}
          />
          <div className="display-control-holder absolute">
            <FontIcon onClick={this.handlerExpandGraph}>{graphExpanded ? 'fullscreen_exit' : 'fullscreen'}</FontIcon>
          </div>
          <CardText className="graph-holder">
            <Graph
              id='graph-id'
              data={graph}
              config={myConfig}
              onClickNode={this.handlerClickNode}
              onClickLink={this.handlerClickLink}
              onZoomed={this.handlerZoomed}
              onMouseOverNode={this.handlerMouseOverNode}
              onMouseOutNode={this.handlerMouseOutNode}
            />
          </CardText>
        </Card>
        <Card className={`md-cell md-cell--4 ${classfiltersCard}`} style={{ zIndex: 2, position: "relative" }} >
          {appStatus === "loading" && <LinearProgress className="loader" key="progress" id={'loading-app'} style={{ marginTop: "0px", borderRadius: "2px", height: "1px" }} />}
          <CardTitle title="Настройки" subtitle={`appStatus: ${appStatus}`}></CardTitle>
          <SelectField
            id="selectGraphType"
            placeholder="Модуль"
            position={SelectField.Positions.BELOW}
            itemLabel="label"
            itemValue="value"
            menuItems={menu}
            onChange={this.handlerChangeType}
          />
          <CardTitle title="Фильтры"></CardTitle>
          <CardText>
            <form onSubmit={this.handlerSubmitForm}>
              <TextField
                id="searchText"
                label="текст"
                type="text"
                value={searchText}
                helpText="Введите текст для фильтрации"
                lineDirection="center"
                inlineIndicator={<FontIcon className={'cursor-default'} onClick={this.handlerClearText}>{'clear'}</FontIcon>}
                helpOnFocus={true}
                onChange={this.handlerChangeText}
              />
              <br /><br />
              <Button onClick={this.handlerSubmitForm} raised secondary disabled={!moduleId} label="Найти" children={<FontIcon>{'search'}</FontIcon>} />
            </form>
          </CardText>
        </Card>
        <VertexInfo moduleId={moduleId} activeVertex={activeVertex} onVertexTableReady={this.handlerVertexTableReady} />
      </div>
    );
  }
}
App = connect()(App);
export default App;