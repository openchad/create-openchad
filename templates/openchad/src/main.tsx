import React from 'react'
import ReactDOM from 'react-dom/client'
import './globals.css'
import App from './App'
import { Container, type AppsProps } from "openchad-react"

const Apps: AppsProps = {
  defaultTab: {
    layout: "horizontal",
    icon: "default",
    tabs: [
      {
        appname: "main-app",
        data: {},
        App: App,
      },
    ],
  },
  size: [80, 20],
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Container Apps={Apps} />
  </React.StrictMode>,
)