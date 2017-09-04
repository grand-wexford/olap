import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import WebFontLoader from 'webfontloader';
// import { createStore } from 'redux'

WebFontLoader.load({
  google: {
    families: ['Roboto:300,400,500,700', 'Material Icons'],
  },
});
const initialState = {
  searchText: "",
  graphType: null
};


const reducer = (state = initialState, action) => {

  switch (action.type) {

    case 'CHANGE_GRAPH_TYPE':
      return { ...state, graphType: action.graphType };

    case 'CHANGE_SEARCH_TEXT':
      return { ...state, graphType: action.searchText };

    default:
      return state;
  }
};

let store = createStore(reducer);
let unsubscribe = store.subscribe( () => console.log(store.getState()));

ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
registerServiceWorker();
unsubscribe();