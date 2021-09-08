import { CodeMaker } from "codemaker";
import {
  ClassDefinition,
  Property,
  TypeScriptWriter,
} from "../../../../utils/typescriptWriter";
const _ = require("lodash");

interface consturctProps {
  name: string;
  type: string;
}
export class Cdk {
  code: CodeMaker;
  constructor(_code: CodeMaker) {
    this.code = _code;
  }
  public initializeStack(name: string, contents: any) {
    const ts = new TypeScriptWriter(this.code);
    const classDefinition: ClassDefinition = {
      name: `${_.upperFirst(_.camelCase(name))}Stack`,
      extends: "Stack",
      export: true,
    };
    ts.writeClassBlock(classDefinition, undefined, "StackProps", contents);
  }

  public initializeConstruct(
    constructName: string,
    propsName: string = "StackProps",
    contents: any,
    constructProps?: consturctProps[],
    properties?: Property[]
  ) {
    const ts = new TypeScriptWriter(this.code);
    this.code.line;
    if (constructProps) {
      ts.writeInterfaceBlock(propsName, constructProps);
      this.code.line();
    }

    const classDefinition: ClassDefinition = {
      name: `${_.upperFirst(_.camelCase(constructName))}`,
      extends: "Construct",
      export: true,
    };

    ts.writeClassBlock(classDefinition, properties, propsName, contents);
  }

  public nodeAddDependency(sourceName: string, valueName: string) {
    this.code.line(`${sourceName}.node.addDependency(${valueName});`);
  }

  public tagAdd(source: string, name: string, value: string) {
    this.code.line(`Tags.of(${source}).add("${name}", "${value}");`);
  }

  public initializeTest(
    description: string,
    contents: any,
    workingDir: string,
    pattern: string
  ) {
    const ts = new TypeScriptWriter(this.code);
    if (pattern === "pattern_v1") {
      this.code.openBlock(`test("${description}", () => {`);
      this.code.line(`const app = new cdk.App()`);
      this.code.line(
        `const stack = new ${_.upperFirst(
          _.camelCase(workingDir)
        )}.${_.upperFirst(_.camelCase(workingDir))}Stack(app, "MyTestStack");`
      );
      this.code.line(
        `const actual = app.synth().getStackArtifact(stack.artifactId).template;`
      );
      this.code.line();
      contents();
      this.code.closeBlock(`})`);
    } else if (pattern === "pattern_v2") {
      this.code.openBlock(`test("${description}", () => {`);
      this.code.line(`const stack = new cdk.Stack();`);
      this.code.line();
      contents();
      this.code.closeBlock(`})`);
    }
  }
}
