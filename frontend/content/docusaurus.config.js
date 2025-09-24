module.exports = {
  title: 'CBOA Resource Centre',
  tagline: 'Calgary Basketball Officials Association - Resources and Information',
  url: 'https://yourapp.com',
  baseUrl: '/resources/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'CBOA',
  projectName: 'resource-centre',

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl: false,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'CBOA Resource Centre',
      logo: {
        alt: 'CBOA Logo',
        src: 'img/logo.svg',
      },
    },
    footer: {
      style: 'dark',
      copyright: `This site and its contents are exclusively for the use of active CBOA members.`,
    },
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula'),
    },
  },
};