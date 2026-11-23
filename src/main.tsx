import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css';
import './index.css'
import App from './App';

import { ConfigProvider } from "antd";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Poppins', sans-serif",
          fontSize: 13,
          colorText: "#1F2937",
          colorTextPlaceholder: "#9CA3AF",
          colorTextDisabled: "#9CA3AF",
          colorBgContainer: "#FFFFFF",
          colorBgContainerDisabled: "#FDF8FB",
          colorBorder: "#FCE7F3",
          colorPrimary: "#D14E9A",
          colorPrimaryHover: "#DE5EA8",
          colorPrimaryActive: "#B83681",
          borderRadius: 8,
          borderRadiusLG: 12,
          controlHeight: 38,
          colorBgElevated: "#FFFFFF",
          boxShadowSecondary: "0 4px 24px rgba(209, 78, 154, 0.08)",
          controlItemBgHover: "rgba(209, 78, 154, 0.06)",
          controlItemBgActive: "rgba(209, 78, 154, 0.12)",
          colorPrimaryBorder: "#D14E9A",
          controlOutline: "rgba(209, 78, 154, 0.18)",
          controlOutlineWidth: 2,
        },
        components: {
          Select: {
            optionSelectedColor: "#D14E9A",
            optionSelectedFontWeight: 600,
            optionSelectedBg: "#FDF2F8",
          },
          Button: {
            colorPrimary: "#D14E9A",
            colorPrimaryHover: "#DE5EA8",
            colorPrimaryActive: "#B83681",
          },
          Table: {
            headerBg: "#FDF4F9",
            headerColor: "#1F2937",
            rowHoverBg: "#FDF2F8",
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)