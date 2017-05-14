import React, {
    Component
} from 'react'
import styles from '../sass/index'

class Home extends Component {
    constructor() {
        super()
    }

    render() {
        const {
            homeData,
            actions
        } = this.props;
        return (
            <div className={styles.main}>
                home 首页
                {
                    homeData.data.map(function(m,index){
                        return <li key={index}>{m.id+" . "}{m.words}</li>
                    })
                }
            </div>
        )
    }
}

export default Home