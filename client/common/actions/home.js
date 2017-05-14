import types from '../constants/actionTypes'
import http from '../../shared/http';

// 发起请求
const startLoading = () => {
    return {
        type: types.LOADING_HOME_MESSAGE
    }
}

// 请求完成
const receiveData = (data) => {
    return {
        type: types.RECEIVE_HOME_MESSAGE,
        data
    }
}

//请求首页数据
function fetchHomeMess() {
    return dispatch => {
        dispatch(startLoading());
        http.get('/getHomeMess')
            .then(response => {
                dispatch(receiveData(response.data))
            })
            .catch(function(error) {
                console.log('@error', error);
            });
    }
}

export default {
    fetchHomeMess
}