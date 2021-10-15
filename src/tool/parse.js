// 从入口文件手动转换所有相关文件

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const cacheFileName = [];

const randomStyleName = () => `s${parseInt(Math.random() * 1000000, 10)}`;
// 递归创建目录 同步方法
function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

// 当前正在遍历的文件最上层作用域的所有变量
const allBinding = [];
function topAllBinding() {
  if (!allBinding || allBinding.length === 0) {
    return [];
  }
  return allBinding[allBinding.length - 1];
}

/**
 * 递归遍历一个节点下所有ObjectExpression的value中的Identifier，检测它们是否在allBinding中
 * @param {*} objectExpressionNode 要遍历的objectExpressionNode AST节点
 * @param {*} parentScope 父级作用域
 * @param {*} parentState 父级状态
 * @param {*} parentPath 父级路径
 * @returns 检测到在allBinding中返回true，否则返回false
 */
function travelObject(
  objectExpressionNode,
  parentScope,
  parentState,
  parentPath,
) {
  // 标记一个Identifier是否在allBinding中
  let suitiable;

  // 循环遍历所有的属性
  for (let idx = 0; idx < objectExpressionNode.properties.length; idx++) {
    // 获取属性节点
    const propNode = objectExpressionNode.properties[idx];
    if (propNode.type === 'SpreadElement') {
      break;
    }
    // 属性节点的value类型是Identifier
    if (propNode.value.type === 'Identifier') {
      suitiable = topAllBinding().includes(propNode.value.name);
      // 不在allbingding中直接跳出循环结束遍历
      if (!suitiable) {
        break;
      }
    } else if (propNode.value.type === 'MemberExpression') {
      // 属性节点的值是MemberExpression
      // 循环获取到最上级的属性名称
      let p = propNode.value;
      while (p.object) {
        p = p.object;
      }
      suitiable = topAllBinding().includes(p.name);
      if (!suitiable) {
        break;
      }
    } else {
      // 往下继续遍历
      traverse(
        propNode.value,
        {
          MemberExpression(__memExpress) {
            let p = __memExpress.node;
            while (p.object) {
              p = p.object;
            }
            suitiable = topAllBinding().includes(p.name);
            if (!suitiable) {
              __memExpress.stop();
            }
            __memExpress.skip();
          },
          // 递归遍历
          ObjectExpression(__objPath) {
            suitiable = travelObject(
              __objPath.node,
              __objPath.scope,
              __objPath.state,
              __objPath,
            );
            if (!suitiable) {
              __objPath.stop();
            }
            __objPath.skip();
          },
          Identifier(__n) {
            suitiable = topAllBinding().includes(__n.node.name);
            if (!suitiable) {
              __n.stop();
            }
          },
        },
        parentScope,
        parentState,
        parentPath,
      );
      if (!suitiable) {
        break;
      }
    }
  }

  return suitiable;
}
/**
 * 递归检测所有文件的style
 */
function detectAll(fileName) {
  console.log('in:' + fileName);
  let styleSheetName;
  if (cacheFileName.includes(fileName)) {
    return;
  }
  cacheFileName.push(fileName);

  let variableDeclaration;

  // 获取传入文件的相对路径
  const {dir: fileDir} = path.parse(`${fileName}`);
  const {dir: outputFileDir} = path.parse(`./dist/${fileName}`);
  const body = fs.readFileSync(fileName, 'utf-8');

  // 转换成ast语法树
  const ast = parser.parse(body, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  let styleSheetExist = false;
  // 获取文件最上层作用域的所有变量
  traverse(ast, {
    Program(proPath) {
      // 推入栈中
      allBinding.push(Object.keys(proPath.scope.getAllBindings()));
    },
    ImportDeclaration(importPath) {
      if (importPath.node.source.value.startsWith('.')) {
        // console.log(importPath.node.source.value);
        const innerFilePath = importPath.node.source.value;
        const fullInnerFilePath = path.relative(
          '.',
          `${fileDir ? fileDir : '.'}/${innerFilePath}`,
        );
        // jsx｜tsx文件直接读
        if (innerFilePath.endsWith('sx')) {
          detectAll(fullInnerFilePath);
        } else {
          // fs.existsSync(fullInnerFilePath + '.jsx') &&
          //   detectAll(fullInnerFilePath + '.jsx');
          fs.existsSync(fullInnerFilePath + '.tsx') &&
            detectAll(fullInnerFilePath + '.tsx');

          // fs.existsSync(fullInnerFilePath + '.ts') &&
          //   detectAll(fullInnerFilePath + '.ts');
          // fs.existsSync(fullInnerFilePath + '.js') &&
          //   detectAll(fullInnerFilePath + '.js');
        }
      }
    },
    ImportSpecifier(importPath) {
      if (importPath.node.imported.name === 'StyleSheet') {
        styleSheetExist = true;
      }
    },
  });
  traverse(ast, {
    JSXAttribute(__all) {
      const {node, state, scope} = __all;
      // 如果style的值是ObjectExpression
      if (
        node.name.name === 'style' &&
        node.value.expression.type === 'ObjectExpression'
      ) {
        // 遍历value节点，检测是否需要新生成一个styleSheet
        const suitiable = travelObject(
          node.value.expression,
          scope,
          state,
          __all,
        );
        // 创建一个新的styleSheet节点
        if (suitiable) {
          //  插入样式定义
          const newStyleName = randomStyleName();
          styleSheetName = 'styles' + randomStyleName();
          if (!variableDeclaration) {
            variableDeclaration = t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier(styleSheetName),
                t.callExpression(
                  t.memberExpression(
                    t.identifier('StyleSheet'),
                    t.identifier('create'),
                  ),
                  [t.objectExpression([])],
                ),
              ),
            ]);
          }

          variableDeclaration.declarations[0].init.arguments[0].properties.push(
            t.objectProperty(t.identifier(newStyleName), node.value.expression),
          );

          __all.replaceWith(
            t.jsxAttribute(
              t.jsxIdentifier('style'),
              t.jsxExpressionContainer(
                t.memberExpression(
                  t.identifier(styleSheetName),
                  t.identifier(newStyleName),
                ),
              ),
            ),
          );
        }
      }
    },
  });

  ast.program.body.push(variableDeclaration);
  if (!styleSheetExist) {
    const importDefaultSpecifier = [
      t.ImportDefaultSpecifier(t.Identifier('{ StyleSheet }')),
    ];
    const importDeclaration = t.ImportDeclaration(
      importDefaultSpecifier,
      t.StringLiteral('react-native'),
    );

    // 将styleSheet插入文件
    ast.program.body.unshift(importDeclaration);
  }
  const {code} = generator(ast, {}, '');
  !fs.existsSync('./dist') && fs.mkdirSync('./dist');
  mkdirsSync(outputFileDir);
  fs.writeFileSync(`./dist/${fileName}`, code);

  allBinding.pop();
  console.log('out:', fileName);
}

detectAll('./index.js');
