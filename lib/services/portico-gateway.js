'use strict';

var _               = require('lodash'),
    path            = require('path'),
    soap            = require('../soap'),
    exceptionMapper = require('../infrastructure/exception-mapper');

function PorticoGateway(hpsConfig, soapUri) {

    var self = this, client,
        config = hpsConfig,
        endPoint = soapUri || 'https://cert.api2.heartlandportico.com/Hps.Exchange.PosGateway/PosGatewayService.asmx',
        wsdl = path.resolve(__dirname,'../../wsdl/cert.wsdl');

    var submitTransaction =
        function submitTransaction(transaction, callback) {
            var req = {
                'Ver1.0': {
                    Header: {
                        VersionNbr: config.versionNumber,
                        DeveloperID: config.developerId,
                        SiteTrace: config.siteTrace
                    },
                    Transaction: transaction
                }
            };
	        if (config.secretApiKey) {
	            req['Ver1.0'].Header.SecretAPIKey = _.trim(config.secretApiKey);
	        } else {
                req['Ver1.0'].Header.LicenseId = config.licenseId;
                req['Ver1.0'].Header.SiteId = config.siteId;
                req['Ver1.0'].Header.DeviceId = config.deviceId;
                req['Ver1.0'].Header.UserName = config.userName;
                req['Ver1.0'].Header.Password = config.password;
	        }

            function clientReady(err, c) {
                if (err) {
                    callback(err, undefined);
                } else {
                    if (!client) { client = c; }
                    client.DoTransaction(req, function (err, gatewayResult) {
                        if (gatewayResult) {
                            var h = gatewayResult['Ver1.0'][0].Header[0];
                            if (h.GatewayRspCode === 0) {
                                try {
                                    callback(null, {header: h, body: gatewayResult['Ver1.0'][0].Transaction[0]});
                                } catch (e) {
                                    callback(null, {header: h});
                                }
                            } else {
                                callback(exceptionMapper.mapGatewayException(h.GatewayTxnId, h.GatewayRspCode, h.GatewayRspMsg[0]), null);
                            }
                        } else if (err) {
                            callback(err, null);
                        } else {
                            callback(new Error('The gateway failed to respond with any data.'), null);
                        }
                    });
                }
            }

            if (!client) {
                soap.createClient(wsdl, clientReady, endPoint);
            } else {
                clientReady(undefined, client);
            }
        };

    return {
        submitTransaction: submitTransaction
    };
}


module.exports = PorticoGateway;
