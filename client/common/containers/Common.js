import React, {
    Children,
    Component,
    cloneElement
} from 'react'
import {
    connect
} from 'react-redux'
import Header from '../components/Header'
import Main from '../components/Main'
import styles from '../sass/Common'
import '../sass/normalize'
import '../sass/global'

class Common extends Component {
    constructor() {
        super()
    }

    render() {
        const {
            children,
            ...props
        } = this.props

        return (
            <div className={styles.app}>
                <Header/>
                <Main>
                    {Children.map(children, child =>
                        cloneElement(child, {...props})
                    )}
                </Main>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return state
}

export default connect(
    mapStateToProps
)(Common)