#### 这个插件出现的原因：
  - 使用`StyleSheet`可以提高性能：
    因为`StyleSheet.create()`创建的样式可以通过ID重复引用，而内联样式则每次都需要创建一个新的对象。
    因为`StyleSheet`允许仅通过`bridge`发送一次样式。 所有后续使用都将引用一个`ID`（尚未实现）。
  - 直接写一个`js`对象作为样式更方便直观一点
  - 经过`babel`处理后自动将`js`对象形式的样式转换为`StyleSheet.create()`后的样式

#### 使用方法
  1. 安装
    `yarn add babel-plugin-react-native-style-rewrite` 或 `npm install babel-plugin-react-native-style-rewrite`
  2. 使用
     找到babel的config文件，加入此插件配置
     ```js
        module.exports = {
          presets: ['module:metro-react-native-babel-preset'],
          plugins: [['import', {libraryName: '@ant-design/react-native'}]],
          env: {
            production: {
              plugins: ['react-native-paper/babel'],
            },
            development: {
              plugins: ['babel-plugin-react-native-style-rewrite'],
            },
          },
        };

     ``` 

#### 这个插件的效果

  转换前：
  ```jsx
    const AppAll = () => {
    const [dialogShow, setDialogShow] = useState(false);
    const [loading, setLoading] = useState(true);
    return (
      <Provider store={store}>
        {loading ? (
          <>
            <Image
              style={{
                width: DEVICE_WIDTH,
                height: DEVICE_REAL_HEIGHT,
              }}
              resizeMode="stretch"
              source={require('./launch_screen.png')}
            />
            <PrivacyDialog
              dialogShow={dialogShow}
              onAgreePress={() => {
                setDialogShow(false);
                setLoading(false);
              }}
            />
          </>
        ) : (
          <App />
        )}
      </Provider>
    );
  };

  AppRegistry.registerComponent(appName, () => AppAll);
  ```
  转换后：
  ```jsx
    const AppAll = () => {
    // 隐私政策弹窗是否显示
    const [dialogShow, setDialogShow] = useState(false); // 第一次打开app的加载状态

    const [loading, setLoading] = useState(true);
    return <Provider store={store}>
        {loading ? <>
            <Image style={styless514055.s367479} resizeMode="stretch" source={require('./launch_screen.png')} />
            <PrivacyDialog dialogShow={dialogShow} onAgreePress={() => {
          setDialogShow(false);
          setLoading(false);
        }} />
          </> : <App />}
      </Provider>;
  };

  AppRegistry.registerComponent(appName, () => AppAll);
  var styless514055 = StyleSheet.create({
    s367479: {
      width: DEVICE_WIDTH,
      height: DEVICE_REAL_HEIGHT
    }
  });
  ```

