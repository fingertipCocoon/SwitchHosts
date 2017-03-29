/**
 * @author oldj
 * @blog https://oldj.net
 */

'use strict'

import React from 'react'
import MyFrame from './frame'
import classnames from 'classnames'
import Group from './group'
import Agent from '../Agent'
import makeId from '../../app/libs/make-id'
import './edit.less'

export default class EditPrompt extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      show: false,
      is_add: true,
      where: 'local',
      title: '',
      url: '',
      last_refresh: null,
      refresh_interval: 0,
      is_loading: false
    }

    this.current_hosts = null
  }

  tryToFocus () {
    let el = this.refs.body && this.refs.body.querySelector('input[type=text]')
    el && el.focus()
  }

  clear () {
    this.setState({
      where: 'local',
      title: '',
      url: '',
      last_refresh: null,
      refresh_interval: 0
    })
  }

  componentDidMount () {
    Agent.on('add_hosts', () => {
      this.setState({
        show: true,
        is_add: true
      })
      setTimeout(() => {
        this.tryToFocus()
      }, 100)
    })

    Agent.on('edit_hosts', (hosts) => {
      this.current_hosts = hosts
      this.setState({
        show: true,
        is_add: false,
        where: hosts.where || 'local',
        title: hosts.title || '',
        url: hosts.url || '',
        last_refresh: hosts.last_refresh || null,
        refresh_interval: hosts.refresh_interval || 0
      })
      setTimeout(() => {
        this.tryToFocus()
      }, 100)
    })

    Agent.on('loading_done', (old_hosts, data) => {
      if (old_hosts === this.current_hosts) {
        this.setState({
          last_refresh: data.last_refresh,
          is_loading: false
        })
        Agent.emit('host_refreshed', data, this.current_hosts)
      }
    })
  }

  onOK () {
    console.log('ok')
    this.setState({
      title: (this.state.title || '').replace(/^\s+|\s+$/g, ''),
      url: (this.state.url || '').replace(/^\s+|\s+$/g, '')
    })

    if (this.state.title === '') {
      this.refs.title.focus()
      return false
    }

    if (this.state.where === 'remote' && this.state.url === '') {
      this.refs.url.focus()
      return false
    }

    let data = Object.assign({}, this.current_hosts, this.state,
      this.state.is_add ? {
        content: `# ${this.state.title}`,
        on: false
      } : {})

    if (!data.id) data.id = makeId()

    delete data['is_add']
    Agent.emit('hosts_' + (this.state.is_add ? 'add' : 'edit') + 'ed', data,
      this.current_hosts)

    this.setState({
      show: false
    })
    this.clear()
  }

  onCancel () {
    this.setState({
      show: false
    })
    this.clear()
  }

  confirmDel () {
    let {lang} = this.props
    if (!confirm(lang.confirm_del)) return
    Agent.emit('del_hosts', this.current_hosts)
    this.setState({
      show: false
    })
    this.clear()
  }

  getRefreshOptions () {
    let {lang} = this.props
    let k = [
      [0, `${lang.never}`],
      [1, `1 ${lang.hour}`],
      [24, `24 ${lang.hours}`],
      [168, `7 ${lang.days}`]
    ]
    if (Agent.IS_DEV) {
      k.splice(1, 0, [0.002778, `10s (for DEV)`]) // dev test only
    }
    return k.map(([v, n], idx) => {
      return (
        <option value={v} key={idx}>{n}</option>
      )
    })
  }

  getEditOperations () {
    if (this.state.is_add) return null

    let {lang} = this.props

    return (
      <div>
        <div className="ln">
          <a href="#" className="del"
             onClick={this.confirmDel.bind(this)}
          >
            <i className="iconfont icon-delete"/>
            <span>{lang.del_hosts}</span>
          </a>
        </div>
      </div>
    )
  }

  refresh () {
    if (this.state.is_loading) return

    Agent.emit('check_host_refresh', this.current_hosts, true)
    this.setState({
      is_loading: true
    }, () => {
      setTimeout(() => {
        this.setState({
          is_loading: false
        })
      }, 1000)
    })

  }

  renderGroup () {
    if (this.state.where !== 'group') return null

    return <Group list={this.props.list}/>
  }

  renderRemoteInputs () {
    if (this.state.where !== 'remote') return null

    let {lang} = this.props

    return (
      <div className="remote-ipts">
        <div className="ln">
          <div className="title">{lang.url}</div>
          <div className="cnt">
            <input
              type="text"
              ref="url"
              value={this.state.url}
              placeholder="http://"
              onChange={(e) => this.setState({url: e.target.value})}
              onKeyDown={(e) => (e.keyCode === 13 && this.onOK()) ||
                                (e.keyCode === 27 && this.onCancel())}
            />
          </div>
        </div>
        <div className="ln">
          <div className="title">{lang.auto_refresh}</div>
          <div className="cnt">
            <select
              value={this.state.refresh_interval}
              onChange={(e) => this.setState(
                {refresh_interval: parseFloat(e.target.value) || 0})}
            >
              {this.getRefreshOptions()}
            </select>

            <i
              className={classnames({
                iconfont: 1,
                'icon-refresh': 1,
                'invisible': !this.current_hosts ||
                             this.state.url !== this.current_hosts.url,
                'loading': this.state.is_loading
              })}
              title={lang.refresh}
              onClick={() => this.refresh()}
            />

            <span className="last-refresh">
              {lang.last_refresh}
              {this.state.last_refresh || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  body () {
    let {lang} = this.props
    return (
      <div ref="body">
        <div className="ln">
          <input id="ipt-local" type="radio" name="where" value="local"
                 checked={this.state.where === 'local'}
                 onChange={(e) => this.setState({where: e.target.value})}
          />
          <label htmlFor="ipt-local">{lang.where_local}</label>
          <input id="ipt-remote" type="radio" name="where" value="remote"
                 checked={this.state.where === 'remote'}
                 onChange={(e) => this.setState({where: e.target.value})}
          />
          <label htmlFor="ipt-remote">{lang.where_remote}</label>
          <input id="ipt-remote" type="radio" name="where" value="group"
                 checked={this.state.where === 'group'}
                 onChange={(e) => this.setState({where: e.target.value})}
          />
          <label htmlFor="ipt-remote">{lang.where_group}</label>
        </div>
        <div className="ln">
          <div className="title">{lang.host_title}</div>
          <div className="cnt">
            <input
              type="text"
              ref="title"
              name="text"
              value={this.state.title}
              onChange={(e) => this.setState({title: e.target.value})}
              onKeyDown={(e) => (e.keyCode === 13 && this.onOK() ||
                                 e.keyCode === 27 && this.onCancel())}
            />
          </div>
        </div>
        {this.renderRemoteInputs()}
        {this.renderGroup()}
        {this.getEditOperations()}
      </div>
    )
  }

  render () {
    let {lang} = this.props

    return (
      <MyFrame
        show={this.state.show}
        head={lang[this.state.is_add ? 'add_hosts' : 'edit_hosts']}
        body={this.body()}
        onOK={() => this.onOK()}
        onCancel={() => this.onCancel()}
        lang={this.props.lang}
      />
    )
  }
}