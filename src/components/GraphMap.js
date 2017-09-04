import React, { Component } from 'react';
import PropTypes from 'prop-types';
import FontIcon from 'react-md/lib/FontIcons';
import { C } from '../constants';

export class GraphMap extends Component {
    constructor(...props) {
        super(...props);
        this.state = {
            mapCollapsed: false
        };
    }

    static get propTypes() {
        return {
            isInit: PropTypes.bool,
            percent: PropTypes.number
        };
    }

    static get defaultProps() {
        return {
            isInit: false,
            percent: 100
        };
    }

    collapseMap = (e) => {
        C('collapseMap', e);
        this.setState({
            ...this.state,
            mapCollapsed: !this.state.mapCollapsed
        });
    }

    setMapClass = () => {
        C('setMapClass');
        let className = 'map-holder';

        className += this.state.mapCollapsed ? ' map-collapsed' : '';
        className += this.props.isInit ? '' : ' hidden';

        return className;
    }

    render() {
        return (
            <div className={this.setMapClass()} style={{ marginTop: -146 }}>
                <div className="map-icons-holder">
                    <div className="collapsible">
                        <FontIcon className="js-zoom-out">zoom_out</FontIcon>
                        <div className="map-percent"> {this.props.percent}% </div>
                        <FontIcon className="js-zoom-in">zoom_in</FontIcon>
                    </div>
                    <FontIcon onClick={this.collapseMap}>exit_to_app</FontIcon>
                </div>
                <img alt="graph_map" src="d3test/i/gparpPreview.png" />
            </div>
        );
    }
}

export default GraphMap;