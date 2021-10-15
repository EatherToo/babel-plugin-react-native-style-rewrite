#### Reasons for the appearance of this plugin：
  - Using `StyleSheet` can improve performance:
    Because the style created by `StyleSheet.create()` can be repeatedly referenced by ID, while inline styles need to create a new object each time.
    Because `StyleSheet` allows to send the style only once through `bridge`. All subsequent uses will refer to an `ID` (not yet implemented).
  - It is more convenient and intuitive to write a `js` object directly as a style
  - After being processed by `babel`, the styles in the form of `js` objects are automatically converted to the styles created by `StyleSheet.create()`

#### Instructions
  1. installation
    `yarn add babel-plugin-react-native-style-rewrite` 或 `npm install babel-plugin-react-native-style-rewrite`
  2. Usage
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

#### The effect of this plugin

  Before conversion:
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
  after conversion:
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

