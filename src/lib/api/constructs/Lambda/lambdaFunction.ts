import { CodeMaker } from "codemaker";
import {
  APITYPE,
  ARCHITECTURE,
  DATABASE,
  NEPTUNEQUERYLANGUAGE,
} from "../../../../utils/constants";
import { TypeScriptWriter } from "../../../../utils/typescriptWriter";

export class LambdaFunction {
  code: CodeMaker;
  constructor(_code: CodeMaker) {
    this.code = _code;
  }
  public initializeLambdaFunction(
    apiType: APITYPE,
    apiName: string,
    content?: any,
    fieldName?: string,
    nestedResolver?: boolean,
    asyncField?: Boolean
  ) {
    if (apiType === APITYPE.graphql) {
      const ts = new TypeScriptWriter(this.code);
      ts.writeAllImports("aws-sdk", "* as AWS");
      ts.writeImports("aws-lambda", ["AppSyncResolverEvent"]);
      // this.code.line(`var AWS = require('aws-sdk');`);
      if (asyncField) {
        this.code.line(
          `var eventBridge = new AWS.EventBridge({ region: process.env.AWS_REGION });`
        );
      }
      this.code.line(`var isEqual = require('lodash.isequal');`);
      this.code.line();
      this.code.line(
        `exports.handler = async (event: AppSyncResolverEvent<any>) => {`
      );
      if (nestedResolver) {
        this.code.line(`console.log(event)`);
      } else {
        this.code.line(`let response = {};
        data.testCollections.fields.${fieldName}.forEach((v: any) => {
          if (v.arguments) {
            let equal = isEqual(
              v.arguments,
              event.arguments
            );
            if (equal) {
              response = v.response;
            }
          } else {
            response = v.response;
          }
        });
        `);
      }

      if (asyncField) {
        this.code.line(`
          await eventBridge
            .putEvents({
              Entries: [
                {
                  EventBusName: "default",
                  Source: "${apiName}",
                  Detail: JSON.stringify({ mutation: "${fieldName}", response: response }),
                },
              ],
            })
            .promise();
            `);
      }

      this.code.line(`
          return response;
        `);
      // this.code.line(
      //   `const data = await axios.post('http://sandbox:8080', event)`
      // );
      // this.code.line(`}`);
      this.code.line();
      this.code.line(`};`);
    } else {
      /* rest api */
      this.code.line(`exports.handler = async (event: any) => {`);
      // this.code.line(
      //   `const data = await axios.post('http://sandbox:8080', event)`
      // );
      this.code.line(`try {`);
      this.code.line();
      this.code.line("const method = event.httpMethod;");
      this.code.line(
        "const requestName = event.path.startsWith('/') ? event.path.substring(1) : event.path;"
      );
      this.code.line("const body = JSON.parse(event.body);");
      content();
      this.code.line();
      this.code.line(`}`);
      this.code.line("catch(err) {");
      this.code.line("return err;");
      this.code.line(`}`);
      this.code.line(`}`);
    }
  }

  public helloWorldFunction(
    name: string,
    database: DATABASE,
    neptuneQueryLanguage?: NEPTUNEQUERYLANGUAGE
  ) {
    const ts = new TypeScriptWriter(this.code);
    ts.writeAllImports("aws-sdk", "* as AWS");
    ts.writeImports("aws-lambda", ["AppSyncResolverEvent"]);
    if (
      database === DATABASE.neptuneDB &&
      neptuneQueryLanguage === NEPTUNEQUERYLANGUAGE.gremlin
    ) {
      ts.writeVariableDeclaration(
        {
          name: "initGremlin",
          typeName: "",
          initializer: () => {
            this.code.line(`require("/opt/utils/gremlin_init")`);
          },
        },
        "const"
      );
    }
    this.code.line(`
    export const ${name} = async(events:AppSyncResolverEvent<any>) => {
    `);
    if (database === DATABASE.neptuneDB) {
      if (neptuneQueryLanguage === NEPTUNEQUERYLANGUAGE.cypher) {
        this.code.line(
          `const url = 'https://' + process.env.NEPTUNE_ENDPOINT + ':8182/openCypher';`
        );
      } else {
        this.code.line(`
        const { g, conn } = initGremlin.initializeGremlinClient(
          process.env.NEPTUNE_ENDPOINT!
        );
        `);
      }
    }
    this.code.line(`
      // write your code here
      console.log(JSON.stringify(events, null, 2));
      `);
    this.code.line("}");
  }

  public emptyLambdaFunction(
    nestedResolver?: boolean,
    database?: DATABASE,
    neptuneQueryLanguage?: NEPTUNEQUERYLANGUAGE
  ) {
    const ts = new TypeScriptWriter(this.code);
    ts.writeAllImports("aws-sdk", "* as AWS");
    ts.writeImports("aws-lambda", ["AppSyncResolverEvent"]);
    if (
      database === DATABASE.neptuneDB &&
      neptuneQueryLanguage === NEPTUNEQUERYLANGUAGE.gremlin
    ) {
      ts.writeVariableDeclaration(
        {
          name: "initGremlin",
          typeName: "",
          initializer: () => {
            this.code.line(`require("/opt/utils/gremlin_init")`);
          },
        },
        "const"
      );
    }
    // this.code.line(`var AWS = require('aws-sdk');`);
    this.code.line();
    this.code.line(
      `exports.handler = async (event: AppSyncResolverEvent<any>) => {`
    );

    if (database === DATABASE.neptuneDB) {
      if (neptuneQueryLanguage === NEPTUNEQUERYLANGUAGE.cypher) {
        this.code.line(
          `const url = 'https://' + process.env.NEPTUNE_ENDPOINT + ':8182/openCypher';`
        );
      } else {
        this.code.line(`
        const { g, conn } = initGremlin.initializeGremlinClient(
          process.env.NEPTUNE_ENDPOINT!
        );
        `);
      }
    }
    // this.code.line(
    //   `const data = await axios.post('http://sandbox:8080', event)`
    // );
    this.code.line(`console.log(JSON.stringify(event,null,2))`);
    if (nestedResolver) {
      this.code.line(`return event.source![event.info.fieldName]`);
    }
    this.code.line();
    this.code.line(`}`);
  }

  public appsyncMutationInvokeFunction() {
    const ts = new TypeScriptWriter(this.code);
    ts.writeAllImports("axios", "axios");
    ts.writeAllImports("aws-sdk", "* as AWS");
    ts.writeImports("aws-lambda", ["EventBridgeEvent"]);

    this.code.line(`
    export const handler = async(events: EventBridgeEvent<string, any>) => {
      
    const query = \`
      mutation MyMutation {
        async_response (input: \${JSON.stringify( events.detail || {} )} )
      }
    \`;

    await axios.post(
      process.env.APPSYNC_API_END_POINT!,
      JSON.stringify({ query }),
      { headers: { "content-type": "application/json", "x-api-key": process.env.APPSYNC_API_KEY, } }
    );

    }
    `);
  }
}
