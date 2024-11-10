// // Imports for Application Insights
// import { ApplicationInsights } from '@microsoft/applicationinsights-web';
// import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

// var reactPlugin = new ReactPlugin();

// var appInsights = new ApplicationInsights({
//     config: {
//         extensions: [reactPlugin],
//         extensionConfig: {
//           [reactPlugin.identifier]: { history: window.history }
//         }
//     }
// });
// appInsights.loadAppInsights();

// export { appInsights, reactPlugin };

// AppInsights.js
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

let reactPlugin = null;

if (typeof window !== 'undefined') {
  reactPlugin = new ReactPlugin();
  var appInsights = new ApplicationInsights({
    config: {
      connectionString: 'InstrumentationKey=5805314d-6868-45ac-94ea-a786c3a55641;IngestionEndpoint=https://eastus2-3.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus2.livediagnostics.monitor.azure.com/;ApplicationId=72c9c636-6015-4ffe-9412-ccafa9455a3a',
      extensions: [reactPlugin],
      extensionConfig: {
        [reactPlugin.identifier]: { history: window.history }
      },
    }
  });

  appInsights.loadAppInsights();
}

export { appInsights, reactPlugin };
