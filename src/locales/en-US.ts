import account from './en-US/account';
import component from './en-US/component';
import globalHeader from './en-US/globalHeader';
import management from './en-US/management';
import menu from './en-US/menu';
import messageCenter from './en-US/messageCenter';
import network from './en-US/network';
import pages from './en-US/pages';
import settingDrawer from './en-US/settingDrawer';
import settings from './en-US/settings';

export default {
  ...account,
  ...management,
  'navBar.lang': 'Languages',
  'layout.user.link.help': 'Help',
  'layout.user.link.privacy': 'Privacy',
  'layout.user.link.terms': 'Terms',
  'app.preview.down.block': 'Download this page to your local project',
  ...globalHeader,
  ...menu,
  ...messageCenter,
  ...settingDrawer,
  ...settings,
  ...network,
  ...component,
  ...pages,
};
