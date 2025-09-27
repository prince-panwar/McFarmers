import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import { BrowserRouter } from "react-router-dom"
import "./Styles.css"
import { Buffer } from "buffer"
window.Buffer = Buffer

createRoot(document.getElementById("root")).render(
    <BrowserRouter>
<App />
    </BrowserRouter>

)
