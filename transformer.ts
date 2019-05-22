import * as ts from 'typescript';
import * as path from 'path';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node;
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
  return ts.visitEachChild(visitNode(node, program), childNode => visitNodeAndChildren(childNode, program, context), context);
}

function visitNode(node: ts.Node, program: ts.Program): ts.Node {
  const typeChecker = program.getTypeChecker();
  if (!isKeysCallExpression(node, typeChecker)) {
    return node;
  }
  if (!node.typeArguments) {
    return ts.createArrayLiteral([]);
  }
  const type = typeChecker.getTypeFromTypeNode(node.typeArguments[0]);
  let nestedProperties: any[] = [];
  const properties = typeChecker.getPropertiesOfType(type);
  properties.forEach(property => {
    nestedProperties = [...nestedProperties, ...getNestedProperties(property, [])];
  });
  return ts.createArrayLiteral(nestedProperties.map(property => ts.createLiteral(property)));
}

const getNestedProperties = (obj: any, properties: string[]) => {
  let nestedProperties: string[] = [];
  let tempProperties = JSON.parse(JSON.stringify(properties));
  const property = obj.escapedName;
  tempProperties.push(property);
  nestedProperties.push(tempProperties.join('.'));
  if (obj.valueDeclaration && obj.valueDeclaration.symbol.valueDeclaration.type.members) {
    obj.valueDeclaration.symbol.valueDeclaration.type.members.forEach((member: any) => {
      nestedProperties = nestedProperties.concat(getNestedProperties(member.symbol, tempProperties));
    });
  } else if (obj.valueDeclaration && obj.valueDeclaration.symbol.valueDeclaration.type.typeName && obj.valueDeclaration.symbol.valueDeclaration.name.flowNode.container.locals.get(obj.valueDeclaration.symbol.valueDeclaration.type.typeName.escapedText)) {
    obj.valueDeclaration.symbol.valueDeclaration.name.flowNode.container.locals.get(obj.valueDeclaration.symbol.valueDeclaration.type.typeName.escapedText).members.forEach((member: any) => {
      nestedProperties = nestedProperties.concat(getNestedProperties(member, tempProperties));
    });
  }
  return nestedProperties;
};

const indexTs = path.join(__dirname, 'index.ts');
function isKeysCallExpression(node: ts.Node, typeChecker: ts.TypeChecker): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const signature = typeChecker.getResolvedSignature(node);
  if (typeof signature === 'undefined') {
    return false;
  }
  const { declaration } = signature;
  return !!declaration
    && !ts.isJSDocSignature(declaration)
    && (path.join(declaration.getSourceFile().fileName) === indexTs)
    && !!declaration.name
    && declaration.name.getText() === 'keys';
}
