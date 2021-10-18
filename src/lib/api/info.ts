const fse = require("fs-extra");

import { ApiModel } from "../../utils/constants";
import { ARCHITECTURE, PanacloudconfigFile, PanacloudConfiglambdaParams } from "../../utils/constants";
import { stopSpinner } from "../spinner";

export const contextInfo = (apiToken: string, entityId: string) => {
  return {
    api_token: apiToken,
    entityId: entityId,
    verifySubscriptionTokenApiUrl:
      "https://vj5t42ne26.execute-api.us-east-1.amazonaws.com/prod/subscriptionToken",
    verifyApiTokenApiUrl:
      "https://vj5t42ne26.execute-api.us-east-1.amazonaws.com/prod/apiToken",
  };
};

export const generatePanacloudConfig = async (
 model:ApiModel
) => {
  const {api: { microServiceFields, architecture,mutationFields,generalFields,nestedResolver,nestedResolverFieldsAndLambdas }} = model;
  let configJson: PanacloudconfigFile = { lambdas: {}};
  const microServices = Object.keys(microServiceFields!);

  for (let i = 0; i < microServices.length; i++) {
    for (let j = 0; j < microServiceFields![microServices[i]].length; j++) {
      const key = microServiceFields![microServices[i]][j];
      const microService = microServices[i];
      const isMutation = mutationFields?.includes(key);
      if (!configJson.lambdas[microService]) {
        configJson.lambdas[microService] = {}
      }
      const lambdas = configJson.lambdas[microService][key] = {} as PanacloudConfiglambdaParams
      lambdas.asset_path = `mock_lambda/${microService}/${key}/index.ts`;
      if (architecture === ARCHITECTURE.eventDriven && isMutation) {
        const consumerLambdas = configJson.lambdas[microService][`${key}_consumer`] = {} as PanacloudConfiglambdaParams
        consumerLambdas.asset_path = `mock_lambda/${microService}/${key}_consumer/index.ts`;
      }
    }
  }

  for (let i = 0; i < generalFields!.length; i++) {
    const key = generalFields![i];
    const isMutation = mutationFields?.includes(key);
    const lambdas = configJson.lambdas[key] = {} as PanacloudConfiglambdaParams
    lambdas.asset_path = `mock_lambda/${key}/index.ts`;
    if (architecture === ARCHITECTURE.eventDriven && isMutation) {
      const consumerLambdas = configJson.lambdas[`${key}_consumer`] = {} as PanacloudConfiglambdaParams
      consumerLambdas.asset_path = `mock_lambda/${key}_consumer/index.ts`;
    }
  }

  if(nestedResolver){
    configJson.nestedLambdas = {}
    const {nestedResolverLambdas} = nestedResolverFieldsAndLambdas!
    for (let index = 0; index < nestedResolverLambdas.length; index++) {
      const key = nestedResolverLambdas[index];
      const nestedLambda = configJson.nestedLambdas[key] = {} as PanacloudConfiglambdaParams
      nestedLambda['asset_path'] = `mock_lambda/nestedResolvers/${key}/index.ts`;      
    }
  }

  await fse.writeJson(`./editable_src/panacloudconfig.json`, configJson);

  return configJson;
};

export const updatePanacloudConfig = async (
model:ApiModel, spinner:any
) => {

  const {
    api: { microServiceFields, architecture,mutationFields,generalFields, nestedResolver,nestedResolverFieldsAndLambdas },
  } = model;

  const configPanacloud: PanacloudconfigFile = fse.readJsonSync('editable_src/panacloudconfig.json')
  let panacloudConfigNew = configPanacloud;

  let prevItems = Object.keys(configPanacloud.lambdas)

  const prevMicroServices = prevItems.filter((val: any) => configPanacloud.lambdas[val].asset_path ? false : true)

  const prevGeneralLambdas = prevItems.filter((val: any) => configPanacloud.lambdas[val].asset_path ? true : false)

  const newMicroServices = Object.keys(microServiceFields!);



  let differenceMicroServices = newMicroServices
    .filter(val => !prevMicroServices.includes(val))
    .concat(prevMicroServices.filter(val => !newMicroServices.includes(val)));
  
  for (let diff of differenceMicroServices) {



    if (newMicroServices.includes(diff)) {
      panacloudConfigNew.lambdas[diff] = {} as PanacloudConfiglambdaParams
    }
    else {
      delete panacloudConfigNew.lambdas[diff];

    }
  }




  for (let service of newMicroServices) {

    const prevMicroServicesLambdas = Object.keys(configPanacloud.lambdas[service])
    let newMicroServicesLambdas = microServiceFields![service];
    let prevMicroServicesMutLambdas : string[] = []

 

    // for (let serv of newMicroServicesLambdas) {
    //   const isMutation = mutationFields?.includes(serv);
    //   if (isMutation && architecture === ARCHITECTURE.eventDriven) {
    //     newMicroServicesLambdas = [...newMicroServicesLambdas,`${serv}_consumer` ]
    //   }
    // }
    if (architecture === ARCHITECTURE.eventDriven){
    // for (let serv of newMicroServicesLambdas) {
    //   const isMutation = mutationFields?.includes(serv);
    //   if (isMutation ) {
    //     //newMicroServicesLambdas.push(`${serv}_consumer`)
    //     newMicroServicesLambdas = [...newMicroServicesLambdas,`${serv}_consumer` ]
    //   }
    // }

    
    prevMicroServicesMutLambdas = prevMicroServicesLambdas.filter ((val:string)=> val.split('_').pop() !== "consumer")


  }




    let differenceMicroServicesLambdas = newMicroServicesLambdas
      .filter(val => !prevMicroServicesMutLambdas.includes(val))
      .concat(prevMicroServicesMutLambdas.filter(val => !newMicroServicesLambdas.includes(val)));


    for (let diff of differenceMicroServicesLambdas) {

      if (newMicroServicesLambdas.includes(diff)) {
        panacloudConfigNew.lambdas[service][diff] = {} as PanacloudConfiglambdaParams
        panacloudConfigNew.lambdas[service][diff].asset_path = `mock_lambda/${service}/${diff}/index.ts`
      }
      else {
        delete panacloudConfigNew.lambdas[service][diff];
        delete panacloudConfigNew.lambdas[service][`${diff}_consumer`];

      }

    }



    for (let mutLambda  of Object.keys(panacloudConfigNew.lambdas[service])){
      const isMutation = mutationFields?.includes(mutLambda);

      if (isMutation && !panacloudConfigNew.lambdas[service][`${mutLambda}_consumer`]){
      
        panacloudConfigNew.lambdas[service][`${mutLambda}_consumer`] = {} as PanacloudConfiglambdaParams
        panacloudConfigNew.lambdas[service][`${mutLambda}_consumer`].asset_path = `mock_lambda/${service}/${mutLambda}_consumer/index.ts`
      }


    }

  }


 let prevGeneralMutLambdas :string[] = []

  if (architecture === ARCHITECTURE.eventDriven){
    // for (let serv of newMicroServicesLambdas) {
    //   const isMutation = mutationFields?.includes(serv);
    //   if (isMutation ) {
    //     //newMicroServicesLambdas.push(`${serv}_consumer`)
    //     newMicroServicesLambdas = [...newMicroServicesLambdas,`${serv}_consumer` ]
    //   }
    // }

    
    prevGeneralMutLambdas = prevGeneralLambdas.filter ((val:string)=> val.split('_').pop() !== "consumer")


  }


  let difference = generalFields!
    .filter(val => !prevGeneralMutLambdas.includes(val))
    .concat(prevGeneralMutLambdas.filter(val => !generalFields?.includes(val)));

  for (let diff of difference) {

    const isMutation = mutationFields?.includes(diff);


    if (generalFields!.includes(diff)) {
      panacloudConfigNew.lambdas[diff] = {} as PanacloudConfiglambdaParams
      panacloudConfigNew.lambdas[diff].asset_path = `mock_lambda/${diff}/index.ts`


      if (architecture === ARCHITECTURE.eventDriven && isMutation) {

        panacloudConfigNew.lambdas[`${diff}_consumer`] = {} as PanacloudConfiglambdaParams
        panacloudConfigNew.lambdas[`${diff}_consumer`].asset_path = `mock_lambda/${diff}_consumer/index.ts`
      }

    }
    else {
      delete panacloudConfigNew.lambdas[diff];
      delete panacloudConfigNew.lambdas[`${diff}_consumer`];

    }


  }

  let newItems = Object.keys(panacloudConfigNew.lambdas)


  const newGeneralMutLambdas = newItems.filter((val: any) => panacloudConfigNew.lambdas[val].asset_path ? true : false)


  for (let mutLambda of newGeneralMutLambdas) {

    const isMutation = mutationFields?.includes(mutLambda);

    if (isMutation && !panacloudConfigNew.lambdas[`${mutLambda}_consumer`]){
      
      panacloudConfigNew.lambdas[`${mutLambda}_consumer`] = {} as PanacloudConfiglambdaParams
      panacloudConfigNew.lambdas[`${mutLambda}_consumer`].asset_path = `mock_lambda/${mutLambda}_consumer/index.ts`
    }

  }




  if(nestedResolver){
    nestedResolverFieldsAndLambdas?.nestedResolverLambdas!.forEach((key: string) => {
      const lambdas = panacloudConfigNew.lambdas[key] = {} as PanacloudConfiglambdaParams
      lambdas.asset_path = `mock_lambda/nestedResolvers/${key}/index.ts`;
    });
  }


  fse.removeSync('editable_src/panacloudconfig.json')
  fse.writeJson(`./editable_src/panacloudconfig.json`, panacloudConfigNew, (err: string) => {
    if (err) {
      stopSpinner(spinner, `Error: ${err}`, true);
      process.exit(1);
    }
  });


  return panacloudConfigNew;


};
