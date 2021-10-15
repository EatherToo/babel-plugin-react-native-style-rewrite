const template = require('@babel/template').default;

const traverse = require('@babel/traverse').default;

const t = require('@babel/types');

const randomStyleName = () => `s${parseInt(Math.random() * 1000000, 10)}`;

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
  allBindingsParam,
) {
  // 标记一个Identifier是否在allBinding中
  let suitiable = true;

  // 循环遍历所有的属性
  for (let idx = 0; idx < objectExpressionNode.properties.length; idx++) {
    // 获取属性节点
    const propNode = objectExpressionNode.properties[idx];
    if (propNode.type === 'SpreadElement') {
      break;
    }
    // 属性节点的value类型是Identifier
    if (propNode.value.type === 'Identifier') {
      suitiable = allBindingsParam.includes(propNode.value.name) && suitiable;
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
      suitiable = allBindingsParam.includes(p.name) && suitiable;
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
            suitiable = allBindingsParam.includes(p.name) && suitiable;
            if (!suitiable) {
              __memExpress.stop();
            }
            __memExpress.skip();
          },
          // 递归遍历
          ObjectExpression(__objPath) {
            suitiable =
              travelObject(
                __objPath.node,
                __objPath.scope,
                __objPath.state,
                __objPath,
                allBindingsParam,
              ) && suitiable;
            if (!suitiable) {
              __objPath.stop();
            }
            __objPath.skip();
          },
          Identifier(__n) {
            suitiable = allBindingsParam.includes(__n.node.name) && suitiable;
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

// stylesheet是否引入了
let styleSheetExist = false;
function detectJSXStyle(programPath, fileName) {
  // styleSheet名称
  let styleSheetName = 'styles' + randomStyleName();
  // 新的styleSheet定义
  let styleSheetDeclaration;

  // 获取所有文件的顶层作用域内的变量名称
  const allBindings = Object.keys(programPath.scope.getAllBindings());
  // 检查一个文件是否引入了StyleSheet
  traverse(
    programPath.node,
    {
      ImportSpecifier(importPath) {
        if (importPath.node.imported.name === 'StyleSheet') {
          styleSheetExist = true;
          // 找到了就停止遍历
          importPath.stop();
        }
      },
    },
    programPath.scope,
    programPath.state,
    programPath,
  );

  // 判断是否处于函数作用域中
  let functionContextCount = 0;
  traverse(programPath.node, {
    JSXAttribute(jsxAttrPath) {
      // 处于非函数作用域中
      if (functionContextCount === 0) {
        return;
      }
      const {node, state, scope} = jsxAttrPath;
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
          jsxAttrPath,
          allBindings,
        );
        // 创建一个新的styleSheet节点
        if (suitiable) {
          //  插入样式定义
          const newStyleName = randomStyleName();
          // 创建新的styleSheet定义
          if (!styleSheetDeclaration) {
            styleSheetDeclaration = t.variableDeclaration('var', [
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

          // 插入新的style节点在定义里面
          styleSheetDeclaration.declarations[0].init.arguments[0].properties.push(
            t.objectProperty(t.identifier(newStyleName), node.value.expression),
          );

          // 替换原有的对象型的style
          jsxAttrPath.replaceWith(
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
    ArrowFunctionExpression: {
      enter() {
        functionContextCount++;
      },
      exit() {
        functionContextCount--;
      },
    },
  });
  // 如果文件没有引入SheetSheet且插入了新的styleSheet
  if (!styleSheetExist && styleSheetDeclaration) {
    const importDeclaration = template.ast`
      import {StyleSheet} from 'react-native';
    `;

    // 将styleSheet插入文件
    programPath.node.body.unshift(importDeclaration);
  }
  // 插入新的styleSheet定义
  if (styleSheetDeclaration) {
    programPath.node.body.push(styleSheetDeclaration);
  }

  styleSheetExist = false;
}

module.exports = function () {
  return {
    visitor: {
      Program: {
        enter(pathP, state) {
          if (state.file.opts.filename.indexOf('node_modules') === -1) {
            detectJSXStyle(pathP, state.file.opts.filename);
          }
        },
      },
    },
  };
};
