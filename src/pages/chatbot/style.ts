// src/pages/chatbot/style.ts
import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  layout: css`
    display: flex;
    flex: 1;
    overflow: hidden;
    @media (max-width: 768px) {
      flex-direction: column;
    }
  `,

  sidebar: css`
    width: 260px;
    flex-shrink: 0;
    background: ${token.colorBgContainer};
    border-right: 1px solid ${token.colorBorderSecondary};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    @media (max-width: 768px) {
      width: 100%;
      max-height: 180px;
      overflow-y: auto;
      border-right: 0;
      border-bottom: 1px solid ${token.colorBorderSecondary};
    }
  `,

  main: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
    background: ${token.colorBgContainer};
  `,

  messages: css`
    flex: 1;
    overflow-y: auto;
    max-height: 60vh;
    min-height: 240px;
    padding: ${token.paddingMD}px;
    display: flex;
    flex-direction: column;
    align-items: center;

    > * {
      width: 100%;
    }
  `,

  footer: css`
    padding: ${token.paddingMD}px;
    border-top: 1px solid ${token.colorBorderSecondary};
    display: flex;
    justify-content: center;
  `,
}));
