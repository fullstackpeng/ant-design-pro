import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ token }) => ({
  content: {
    maxHeight: '60vh',
    overflowY: 'auto',
    lineHeight: 1.7,
    '& img': {
      maxWidth: '100%',
      height: 'auto',
    },
    '& table': {
      maxWidth: '100%',
      borderCollapse: 'collapse',
    },
    '& th, & td': {
      border: `1px solid ${token.colorBorderSecondary}`,
      padding: token.paddingXS,
    },
  },
}));
