import types from '../constants/actionTypes'

var stateInit = {
  loading: false,
  data: []
};

function homeData(state = stateInit, action) {
  switch (action.type) {
    case types.LOADING_HOME_MESSAGE:
      return Object.assign({}, state, {
        loading: true
      })
    case types.RECEIVE_HOME_MESSAGE:
      return Object.assign({}, state, {
        loading: false,
        data: action.data
      })
    default:
      return state
  }
}

export default homeData