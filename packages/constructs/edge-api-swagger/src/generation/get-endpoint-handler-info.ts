import * as ts from 'typescript'
import path from 'path'
import { ResolvedProperty, EndpointsInput, EndpointHandlerInfo } from './types'

const typeSyntaxKindToString = (kind: ts.SyntaxKind) => {
  switch (kind) {
    case ts.SyntaxKind.StringKeyword:
      return 'string'
    case ts.SyntaxKind.NumberKeyword:
      return 'number'
    case ts.SyntaxKind.BooleanKeyword:
      return 'boolean'
    case ts.SyntaxKind.NullKeyword:
      return 'null'
    case ts.SyntaxKind.AnyKeyword:
      return 'any'
  }
}

const cleanComment = (comment: string) => {
  return comment
    .split('\n')
    .map((s) => {
      if (s.startsWith('*')) {
        return s.substring(1)
      }
      return s
    })
    .join('\n')
}

const resolveTypeNode = (typeNode: ts.TypeNode, typeChecker: ts.TypeChecker): ResolvedProperty => {
  if (ts.isTypeLiteralNode(typeNode)) {
    const properties: ResolvedProperty[] = forEachChildAsArray(typeNode)
      .filter((node) => ts.isPropertySignature(node) && ts.isIdentifier(node.name) && node.type)
      .map((node) => {
        if (!(ts.isPropertySignature(node) && ts.isIdentifier(node.name) && node.type)) {
          throw new Error('this should never happen')
        }
        if (ts.isTypeReferenceNode(node.type) || ts.isTypeLiteralNode(node.type)) {
          return {
            ...resolveTypeNode(node.type, typeChecker),
            name: node.name.escapedText.toString(),
            isOptional: !!node.questionToken,
          }
        }
        return {
          typeName: typeSyntaxKindToString(node.type.kind),
          name: node.name.escapedText.toString(),
          isOptional: !!node.questionToken,
        }
      })

    return {
      properties,
      isLiteral: false,
    }
  }

  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    const typeName = typeNode.typeName.escapedText.toString()
    const type = typeChecker.getTypeAtLocation(typeNode)
    const [declaration] = type.aliasSymbol?.declarations || []
    if (!declaration) {
      throw new Error('unable to find declaration for type ' + type.aliasSymbol?.getName())
    }
    if (!ts.isTypeAliasDeclaration(declaration)) {
      throw new Error('unable to resolve type ' + typeName)
    }
    if (ts.isMappedTypeNode(declaration.type)) {
      return {
        typeName,
        isMappedType: true,
        isLiteral: false,
        properties: typeNode.typeArguments?.map((ta) => resolveTypeArgs(ta, typeChecker)),
        isOptional: !!declaration.type.questionToken,
      }
    }
    const { properties, isOptional } = resolveTypeNode(declaration.type, typeChecker)
    return {
      typeName,
      properties,
      isLiteral: false,
      isOptional,
    }
  }

  return {
    typeName: typeSyntaxKindToString(typeNode.kind),
  }
}

const resolveTypeArgs = (tn: ts.TypeNode, typeChecker: ts.TypeChecker): ResolvedProperty => {
  if (ts.isTypeReferenceNode(tn)) {
    return resolveTypeNode(tn, typeChecker)
  }
  if (ts.isUnionTypeNode(tn)) {
    return {
      isLiteral: false,
      isMappedType: false,
      isUnionType: true,
      properties: tn.types.map((t) => resolveTypeArgs(t, typeChecker)),
    }
  }
  return {
    typeName: typeSyntaxKindToString(tn.kind),
  }
}

const resolveReturnType = (callExpression: ts.CallExpression, typeChecker: ts.TypeChecker) => {
  const [arrowFunc] = callExpression.arguments
  if (!ts.isArrowFunction(arrowFunc) || !arrowFunc.type || !ts.isTypeReferenceNode(arrowFunc.type)) {
    return
  }
  const [responseType] = arrowFunc.type.typeArguments || []
  if (!responseType || !ts.isTypeReferenceNode(responseType) || !ts.isIdentifier(responseType.typeName)) {
    return
  }
  const returnTypeWrapper = responseType.typeName.escapedText.toString()
  if (returnTypeWrapper === 'JSONResponse') {
    const [typeArg] = responseType.typeArguments || []
    if (typeArg && ts.isTypeReferenceNode(typeArg)) {
      return {
        isJSONResponse: true,
        response: resolveTypeArgs(typeArg, typeChecker),
      }
    }
  } else if (returnTypeWrapper === 'RedirectionResponse') {
    return {
      isRedirection: true,
    }
  }
}

const forEachChildAsArray = (node: ts.Node) => {
  const children: ts.Node[] = []
  node.forEachChild((child) => {
    children.push(child)
  })
  return children
}

const getHandler = (node: ts.Node) => {
  const children = forEachChildAsArray(node)
  const variableStatements = children.filter(ts.isVariableStatement)

  const exportedVariableStatements = variableStatements.filter(
    (node) => !!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  )

  const handlerVariableStatement = exportedVariableStatements
    .map((exportedVariableStatement) =>
      forEachChildAsArray(exportedVariableStatement)
        .filter(ts.isVariableDeclarationList)
        .map((variableDeclarationList) => variableDeclarationList.declarations),
    )
    .flat(2)
    .find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.escapedText === 'handler')

  return handlerVariableStatement
}

const getTsStuff = (handlerFileLocation: string) => {
  const file = path.resolve(handlerFileLocation)
  const program = ts.createProgram([file], { allowJs: true })
  const sourceFile = program.getSourceFile(file)
  const typeChecker = program.getTypeChecker()!

  if (!sourceFile) {
    throw new Error('no source file')
  }

  const handler = getHandler(sourceFile)

  if (!handler) {
    throw new Error(`handler not found for file ${handlerFileLocation}`)
  }

  const { initializer } = handler

  if (!initializer || !ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression)) {
    throw new Error(`invalid handler export found for file ${handlerFileLocation}`)
  }

  if (!initializer.typeArguments) {
    return
  }
  const isJsonRequestHandler = initializer.expression.escapedText === 'jsonRequestHandler'
  const isFormRequestHandler = initializer.expression.escapedText === 'formRequestHandler'

  const comments: string[] = [`Found in ${handlerFileLocation}`]
  ts.forEachLeadingCommentRange(sourceFile.text, handler.getFullStart(), (pos, end, kind) => {
    const comment =
      kind === ts.SyntaxKind.MultiLineCommentTrivia
        ? sourceFile.text.slice(pos + 2, end - 2)
        : sourceFile.text.slice(pos + 2, end)
    comments.push(cleanComment(comment))
  })

  const [env, body] = initializer.typeArguments
  const envType = env ? resolveTypeNode(env, typeChecker) : undefined
  const bodyType = body ? resolveTypeNode(body, typeChecker) : undefined
  const returnType = resolveReturnType(initializer, typeChecker)

  return {
    isJsonRequestHandler,
    isFormRequestHandler,
    envType,
    bodyType,
    returnType,
    description: comments.join('\n'),
  }
}

export const getEndpointHandlerInfo = (endpoints: EndpointsInput): EndpointHandlerInfo[] => {
  return endpoints.map(({ codePath, ...rest }) => {
    if (!codePath) {
      return rest
    }
    const handlerInfo = getTsStuff(codePath)

    return {
      codePath,
      ...rest,
      ...handlerInfo,
    }
  })
}
