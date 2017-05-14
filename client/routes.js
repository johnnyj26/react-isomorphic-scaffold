// Hook for server
if (typeof require.ensure !== 'function') {
    require.ensure = function(dependencies, callback) {
        callback(require)
    }
}

const routes = {
    childRoutes: [{
        path: '/',
        component: require('./common/containers/Root'),
        indexRoute: {
            getComponent(nextState, callback) {
                require.ensure([], require => {
                    callback(null, require('./home/containers/App'))
                }, 'home')
            }
        },
        childRoutes: [{
            path: 'choiceness',
            getComponent(nextState, callback) {
                require.ensure([], require => {
                    callback(null, require('./choiceness/containers/App'))
                }, 'choiceness')
            }
        }, {
            path: 'columnWorks',
            getComponent(nextState, callback) {
                require.ensure([], require => {
                    callback(null, require('./columnWorks/containers/App'))
                }, 'columnWorks')
            }
        }]
    }]
}

export default routes