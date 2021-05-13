import React,{Component} from 'react'
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Modal,
  PermissionsAndroid,
  DeviceEventEmitter,
  ScrollView,
  FlatList,
  ActivityIndicator
} from 'react-native'
import SystemSetting from 'react-native-system-setting'
import RNFS from 'react-native-fs'
import DocumentPicker from 'react-native-document-picker'

import {mTop,px,scaleSize} from './compoent/unit/Px'
import BleModule from './compoent/unit/BleModule'

//确保全局只有一个BleManager实例，BleModule类保存着蓝牙的连接信息

global.BluetoothManager = new BleModule();

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
        status:'未连接',

    /*----------蓝牙部分start-------- */
        data: [],
        scaning: false,
        isConnected: false,
        text: "",
        writeData: "",
        receiveData: "",
        readData: "",
        isMonitoring: false,   
    /*----------蓝牙部分end-------- */
    /**---------弹窗部分------------- */
        isRefuseLocation:false,  //是否彻底拒绝位置权限
        isError:false,
        islocation:false,
        read:['这里显示收发内容：'],
        send:'',
        kong:'',
        kong_data:'',
        upload:true,
        isUpload:false


    };
    this.bluetoothReceiveData = []; //蓝牙接收的数据缓存
    this.deviceMap = new Map(); 
  }
  componentDidMount() {
    BluetoothManager.start(); //蓝牙初始化
    this.updateStateListener = BluetoothManager.addListener( "BleManagerDidUpdateState",this.handleUpdateState);
    this.stopScanListener = BluetoothManager.addListener("BleManagerStopScan",this.handleStopScan);
    this.discoverPeripheralListener = BluetoothManager.addListener("BleManagerDiscoverPeripheral", this.handleDiscoverPeripheral);
    this.connectPeripheralListener = BluetoothManager.addListener("BleManagerConnectPeripheral",this.handleConnectPeripheral);
    this.disconnectPeripheralListener = BluetoothManager.addListener("BleManagerDisconnectPeripheral",this.handleDisconnectPeripheral);
    this.updateValueListener = BluetoothManager.addListener("BleManagerDidUpdateValueForCharacteristic",this.handleUpdateValue); 
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow',this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide',this._keyboardDidHide)
    
    this._getAuthority()
   
}
componentWillUnmount() {
    this.updateStateListener.remove();
    this.stopScanListener.remove();
    this.discoverPeripheralListener.remove();
    this.connectPeripheralListener.remove();
    this.disconnectPeripheralListener.remove();
    this.updateValueListener.remove();
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
    if (this.state.isConnected) {
        BluetoothManager.disconnect(); //退出时断开蓝牙连接
    }
}
_getAuthority = async () =>{
    try{
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      )
       
      const granted1 = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      )
       console.log(granted)
    }catch(err){
      console.log(err)
    }
  }
/**--------------软键盘开始----------------- */
_keyboardDidHide = () => {
    console.log('软键盘关闭');
}
_keyboardDidShow = () => console.log('软键盘打开');
/**--------------软键盘结束----------------- */
/**-----------蓝牙start------------ */
//蓝牙状态改变
handleUpdateState=(args)=>{
    console.log('BleManagerDidUpdateStatea:', args);
    BluetoothManager.bluetoothState = args.state;  
    if(args.state == 'on'){  //蓝牙打开时自动搜索
        this.scan();
    }            
}
//扫描结束监听
handleStopScan=()=>{
    console.log('BleManagerStopScan:','Scanning is stopped');
    this.setState({scaning:false});
}
//搜索到一个新设备监听
handleDiscoverPeripheral=(data)=>{
    console.log(data.id + data.name);
    /*
      这里的data.name是蓝牙的名称，这里你要把命令状态下的蓝牙名称与ota状态下的蓝牙名称都要写在下面的判断力
      比如我的蓝牙命令状态的名称为MELLAHOME-NN，ota状态下的名称为kings_ota_boot
    */
    if(data.name ==='MELLAHOME-NN'||data.name === 'kings_ota_boot'){
      //下面要判断data.name与ota状态下的名称是否一致
        if(data.name === 'kings_ota_boot'){
          this.setState({
            isUpload:true
          })
        }else{
          this.setState({
            isUpload:false
          })
        }
      this.connect(data.id);
        this.setState({
            isConnected: true,
            status: '连接中',
        });
    }            
}
//蓝牙设备已连接 
handleConnectPeripheral=(args)=>{
    console.log('BleManagerConnectPeripheral:', args); 
    
    console.log('蓝牙设备已连接')
}
 //蓝牙设备已断开连接
 handleDisconnectPeripheral=(args)=>{
    BluetoothManager.initUUID(); 
    this.setState({
        isConnected:false,
        status: '未连接',
    });
}

//校验函数
check = (arr) => {
    if(arr.length < 3){
        return
    }
    let i 
    let checkFloag  = arr[1];

    for( i = 2 ; i < arr.length - 2 ; i++){
        checkFloag = checkFloag ^ arr[i];
    }
    return checkFloag;
}
//从得到的数据里获得一组正确的数据
setNewArr = (arr) => { //把所有的正确数据都放在newArr中（可能多组包）
    let  j , num , newArr = [] , trueArr = []  , length = arr.length;

    for(let i = 0 ; i < length ; i++ ){
        
        if(arr[i] === 0xAA){  
            j = i ;
            let dataLength = arr[j+1];
            if(arr[dataLength+1] === 0x55) {
                for( ; j <= dataLength + 1+i  ; j++) {
                    newArr.push(arr[j]);
                }
               if(this.check(newArr) === newArr[newArr.length-2] ){
                   trueArr.push(newArr);
                   newArr = [];
               }else{
                   newArr = [];
               }
              
            }

        }
        
    }
    return trueArr
}
sendArr = (command,arr) => {
    //把传过来的数组变成字符串后加密,加密后转换成数组
    let text  = AesUtil.encrypt(arr.join(''))
    // console.log(text)
    let list = []
    for(let i = 0 ; i < text.length-1 ; i+=2){
        list.push((text.substring(i,i+2)))
    }
    // console.log(list)
    arr = list
    //帧长,如果帧长是一位,前面加0
    let length = arr.length+3
    length = length.toString(16)
    if(length.length<2){
        length = '0' + length
    }
    // console.log(length , command)
    //开始生成校验位
    let Check = (parseInt(length,16) ^ parseInt(command,16))
    for(let i = 0 ; i < arr.length ; i++){
        Check = Check^ parseInt(arr[i].toString(16),16)
    }
    //如果校验位长度为1前面补0
    Check = Check.toString(16)
    if(Check.length<2) {
        Check = '0'+Check
    }
    // console.log(Check)
    let str = 'AA'+length+command+arr.join('')+Check +'55'
    // console.log('发送的数据',str)
    //    AA    13    f1    6f    f8    a0    c0    68    d7    77    d7    1a    3a    c1    ad    4e    92    96    de    d2    55
    //  ["aa", "13", "f1", "6f", "f8", "a0", "c0", "68", "d7", "77", "d7", "1a", "3a", "c1", "ad", "4e", "92", "96", "de", "d2", "55"]
    this._renderWriteView(BluetoothManager.writeWithoutResponseCharacteristicUUID,this.writeWithoutResponse, str);
}
// 发送数据
sendData = (command,arr) => {
    //帧长,如果帧长是一位,前面加0
    console.log('arr',arr);
    console.log('command',command);
    let length = arr.length+3
    length = length.toString(16)
    if(length.length<2){
        length = '0' + length
    }
    // console.log(length , command)
    //开始生成校验位
    let Check = (parseInt(length,16) ^ parseInt(command,16))
    for(let i = 0 ; i < arr.length ; i++){
        Check = Check^ parseInt(arr[i].toString(16),16)
    }
    //如果校验位长度为1前面补0
    Check = Check.toString(16)
    if(Check.length<2) {
        Check = '0'+Check
    }
    // console.log(Check)
    let str = 'AA'+length+command+arr.join('')+ Check +'55'
    console.log('发送的数据',str)
    let {read} = this.state
    read.push(`发送的数据:${str}`)
    this.setState({
        read
    },()=>{
        this._flatList.scrollToEnd();
        const time = setTimeout(()=>{
            this._flatList.scrollToEnd()
            clearTimeout(time)
        })
    })
    
    //    AA    13    f1    6f    f8    a0    c0    68    d7    77    d7    1a    3a    c1    ad    4e    92    96    de    d2    55
    //  ["aa", "13", "f1", "6f", "f8", "a0", "c0", "68", "d7", "77", "d7", "1a", "3a", "c1", "ad", "4e", "92", "96", "de", "d2", "55"]

    // this._renderWriteView(BluetoothManager.writeWithoutResponseCharacteristicUUID,this.writeWithoutResponse, str);

    this._renderWriteView(BluetoothManager.writeWithResponseCharacteristicUUID ,this.write, str);
}
sendStrData = (command , str1) => {
    let arr = []
    for(let i = 0 ; i < str1.length ; i = i+2){
        console.log(i,i+2,str1.substr(i,2));
        arr.push(str1.substr(i,2))
    }
    console.log(arr);
    this.sendData(command,arr)

}

//接收到新数据
handleUpdateValue=(data)=>{
    //ios接收到的是小写的16进制，android接收的是大写的16进制，统一转化为大写16进制
    // let value = data.value.toUpperCase();   
    let nexttime = new Date()
    // console.log(nexttime-time);
    time = nexttime
    let value =data 
    this.bluetoothReceiveData.push(value); 
    this.setState({receiveData:this.bluetoothReceiveData.join('')})
    let dataArr = value.value.map(item => {
        if(item.toString(16).length < 2){
            return '0'+item.toString(16)
        }else{
            return item.toString(16)
        }  
    })
    console.log('...接收的数据',dataArr);
    let str = ''
    dataArr.map((item,index) =>{
        if(index != dataArr.length-1){
            str +=`${item}-`
        }else{
            str += item
        }
    })
    let {read} = this.state
    read.push(`接收的数据为：${str}`)
    this._flatList.scrollToEnd()

    //获得正确的数据
    let trueArr = this.setNewArr(value.value);

    //建立缓冲区
    let buffer = [];
    if(trueArr){
        for(let i = 0 ; i < trueArr.length ; i++ ){
            buffer.push(trueArr[i]);
        }
    }
    // console.log('缓冲区数据',buffer.flat())
    
    if(buffer){
        for(let i = 0 ; i< buffer.length ; ) {
    
            let newArr = buffer[0];
            newArr = newArr.flat();
            buffer.splice(0,1);
            if(newArr){
                if(newArr[2] === 240){
                    console.log('现在需要发送加密后的数据给温度计')
                    let randomNum = newArr.slice(3,newArr[1].toString(10))  
                    let dataArr = randomNum.map(item => {
                        if(item.toString(16).length < 2){
                            return '0'+item.toString(16)
                        }else{
                            return item.toString(16)
                        }  
                    })
                    console.log('转换后的数据' , dataArr)
                    this.sendArr('71', dataArr)
                }else if(newArr[2] === 241) {
                    console.log('认证成功')
                    console.log('查询探头编号')
                    const timeid = setTimeout(()=>{
                        this.sendData('31',[])
                        clearTimeout(timeid)
                    },50)
                     
                }else if(newArr[2] ===211){
                    console.log('结束成功1122')
                   
                }else if(newArr[2] ===177){     //探头信息
                    console.log('探头信息',dataArr)
                    
                    switch(dataArr[7]){
                        case '01': console.log('腋温'); break;
                        case '02': console.log('肛温'); break;
                        case '03': console.log('耳温'); break;
                    }
                    
                }else if(newArr[2] === 176){
                    // Alert.alert('写入成功')
                    Toast.success('写入成功')
                    console.log('写入成功');
                    const timeid = setTimeout(()=>{
                        this.sendData('31',[])
                        clearTimeout(timeid)
                    },100)
                     
                }else if(newArr[2] ===199){     //耳温标定数据
                    // console.log('十进制数据',newArr)
                    let dataArr1 = newArr.map(item => {
                        if(item.toString(16).length < 2){
                            return '0'+item.toString(16)
                        }else{
                            return item.toString(16)
                        }  
                    })
                    // console.log('16进制数据11111111111' , dataArr1,'\n____________________________')
                    // let data3 = this.dataLength(dataArr1[3])
                    // let data4 = this.dataLength(dataArr1[4])
                    // let data5 = this.dataLength(dataArr1[5])
                    // let data6 = this.dataLength(dataArr1[6])
                    // let data7 = this.dataLength(dataArr1[7])
                    // let data8 = this.dataLength(dataArr1[8])
                    
  
                    

                   
                    
                }
                
            }
        }
    }
}
//监测字符长度是否小于2，如果小于则进行添0操作
dataLength= (item) => {
    if(item.length < 2){
        return '0' +  item       
    }else{
        return item
    }
}
//连接
connect(item){
    //当前蓝牙正在连接时不能打开另一个连接进程
    if(BluetoothManager.isConnecting){
        console.log('当前蓝牙正在连接时不能打开另一个连接进程');
        return;
    }
    if(this.state.scaning){  //当前正在扫描中，连接时关闭扫描
        BluetoothManager.stopScan();
        this.setState({scaning:false});
    }
    this.setState({data:item});
    
    BluetoothManager.connect(item)
        .then(peripheralInfo=>{
            console.log('我要去打开通道');
            this.setState ({
                status: '已连接',
            })

            this._renderReceiveView(BluetoothManager.nofityCharacteristicUUID,this.notify);
        })
        .catch(err=>{                
            //连接失败
            this.alert('连接失败');
        })
} 

_renderReceiveView=(characteristics,onPress)=>{
    if(characteristics.length == 0){
        return;
    }
    characteristics.map((item,index)=>{
        onPress(index)
        }    
    )    
}
//没有连接
disconnect(){
    this.setState({
        data:[...this.deviceMap.values()], 
        isConnected:false
    });
    BluetoothManager.disconnect();
}
//扫描
scan(){
    if(this.state.scaning){  //当前正在扫描中
        BluetoothManager.stopScan();
        this.setState({scaning:false});
    }
    if(BluetoothManager.bluetoothState == 'on'){
        BluetoothManager.scan()
            .then(()=>{
                this.setState({ scaning:true });
            }).catch(err=>{

            })
    }else{
        BluetoothManager.checkState();
        if(Platform.OS == 'ios'){
            //this.alert('请开启手机蓝牙');
            this.alert('请打开蓝牙'); 
            
        }else{
            //提示，请开启手机蓝牙
            Alert.alert('提示','请打开蓝牙',[
                {
                    text:'取消',
                    onPress:()=>{ }    
                },
                {
                    text:'打开',
                    onPress:()=>{ BluetoothManager.enableBluetooth() }
                }                    
            ]);
        } 
    }
}

alert(text){
    Alert.alert('提示',text,[{ text:'确定',onPress:()=>{ } }]);
}
write=(index)=>{
    BluetoothManager.write(this.state.text,index)
        .then(()=>{
            this.bluetoothReceiveData = [];
            this.setState({
                writeData:this.state.text,
                text:'',
            })
            console.log('发送成功');
            this.setState({
              upload:true
            })
            if(this.state.isUpload === true){
              Alert.alert('升级成功')
            }
            
        })
        .catch(err=>{
          console.log('发送失败',err);
          this.setState({
            upload:true
          })
          if(this.state.isUpload === true  ){
            if(err === 'Error writing status: 133'){
              Alert.alert('升级成功')
            }else{
              Alert.alert('升级失败')
            }
          }
        })        
}

writeWithoutResponse=(index)=>{
    if(this.state.text.length == 0){
        return;
    }
    BluetoothManager.writeWithoutResponse(this.state.text,index)
        .then(()=>{
            this.bluetoothReceiveData = [];
            this.setState({
                writeData:this.state.text,
                text:'',
            })
        })
        .catch(err=>{
            // this.alert('发送失败');
        })        
}
read=(index)=>{
    BluetoothManager.read(index)
        .then(data=>{
            this.setState({readData:data});
        })
        .catch(err=>{
            this.alert('读取失败');
        })
}

notify=(index)=>{
    BluetoothManager.startNotification(index)
        .then(()=>{
            this.setState({isMonitoring:true});
            const timeID = setTimeout(()=>{
                this._renderWriteView(BluetoothManager.writeWithoutResponseCharacteristicUUID,this.writeWithoutResponse, 'AA0470A5D155');
                console.log('发送成功')
                clearTimeout(timeID)
            },500)
        })
        .catch(err=>{
            this.setState({isMonitoring:false});
            this.alert('Failed to open');                
        })
}
_renderReceiveView=(characteristics,onPress)=>{
    if(characteristics.length == 0){
        return;
    }
    characteristics.map((item,index)=>{
        onPress(index)
        }    
    )    
}
_renderWriteView=(characteristics,onPress,text,num = 0)=>{
    if(characteristics.length == 0){
        return;
    }
    this.setState({
        text: text
    });
    onPress(num);  
}
/**-----------蓝牙end------------ */





//连接蓝牙
_scanBlue = () => {
    /**
     * 1.检查有没有定位权限
     * 2.检查定位有没有打开
     * 3.检查蓝牙有没有打开
     * 4.连接蓝牙
     */
    try{
        //查询有没有给定位权限，没有则打开设置
        console.log(0x31&0x80,0x31&&0x80)
        const granted = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION)
        console.log('granted' , granted)
        granted
            .then(data => {
                console.log(data)
                if(data){
                    // 有权限
                    console.log('有权限')
                    //查询GPS有没有打开
                    this._isopenGPS();
                }else{
                    // 没权限
                    console.log('没权限')
                    if(this.state.isRefuseLocation){
                    //    Alert.alert('必须要有定位权限，不然无法搜索到蓝牙设备')
                       this.setState({
                        isError:true,
                        errText:`必须要有定位权限，不然无法搜索到蓝牙设备`
                    })
                    }
                    //
                    this.setDingwei()
                }
            })
            .catch(err=>{
                console.log('查询权限抛出的异常：',err)
            })
    }catch(err){
        console.log('点击小狗抛出的异常' , err)
    }

}
//设置定位权限
setDingwei = async () => {
    try {
        //返回string类型
        const granted = await PermissionsAndroid.request(
         PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
       
        )
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
         console.log("你已获取了定位权限")
         
        } else {
          console.log(granted+'------'+ PermissionsAndroid.RESULTS.GRANTED)
         switch(granted){
           case 'denied': console.log('用户拒绝了'); break;
           case 'never_ask_again': console.log('用户已拒绝，且不愿被再次询问');
                                   this.setState({isRefuseLocation:true})
   
            break;
         }
        }
       } catch (err) {
         console.log(err);
       }
}
_openAppSetting = async () => {
    await SystemSetting.openAppSystemSettings()
    this.setState({isError:false})
}
   //查询位置信息权限有没有打开，没有则跳转到位置信息界面。
_isopenGPS = async() =>{
    let istrue =  await SystemSetting.isLocationEnabled();
    console.log(istrue)
    if(istrue) {
        //检测蓝牙
      console.log('位置信息打开了')
      if(this.state.isConnected === true){
        alert("宠物温度计已连接");
        }else {
            this.scan();
        }   
    //   ToastAndroid.show('定位已经打开了',ToastAndroid.SHORT)
    }else {
        this.setState({
            islocation:true,
            errText:`请打开定位，不然可能搜索不到蓝牙设备`
        })
        // Alert.alert('请打开定位，不然可能搜索不到蓝牙设备')
    }
     
}



_test = () => {
    console.log('进入新版空中升级');
    RNFS.readFile('/storage/emulated/0/DingTalk/aes_ota_MellaHome(14).bin','base64' )
        .then(res=>{
            console.log(res);
            console.log('-----------------------');
            this._base64to2(res)

        })
        .catch(err=>{
            console.log('err',err);
        })
}

_base64to2 = (base64)=>{
    const map = { "0": 52, "1": 53, "2": 54, "3": 55, "4": 56, "5": 57, "6": 58, "7": 59, "8": 60, "9": 61, "A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6, "H": 7, "I": 8, "J": 9, "K": 10, "L": 11, "M": 12, "N": 13, "O": 14, "P": 15, "Q": 16, "R": 17, "S": 18, "T": 19, "U": 20, "V": 21, "W": 22, "X": 23, "Y": 24, "Z": 25, "a": 26, "b": 27, "c": 28, "d": 29, "e": 30, "f": 31, "g": 32, "h": 33, "i": 34, "j": 35, "k": 36, "l": 37, "m": 38, "n": 39, "o": 40, "p": 41, "q": 42, "r": 43, "s": 44, "t": 45, "u": 46, "v": 47, "w": 48, "x": 49, "y": 50, "z": 51, "+": 62, "/": 63 }
    let len = base64.length * .75 // 转换为int8array所需长度
    base64 = base64.replace(/=*$/, '') // 去掉=号（占位的）

    const int8 = new Int8Array(len) //设置int8array视图
    let arr1, arr2, arr3, arr4, p = 0

    for (let i = 0; i < base64.length; i += 4) {
        arr1 = map[base64[i]] // 每次循环 都将base644个字节转换为3个int8array直接
        arr2 = map[base64[i + 1]]
        arr3 = map[base64[i + 2]]
        arr4 = map[base64[i + 3]]
        // 假设数据arr 数据 00101011 00101111 00110011 00110001
        int8[p++] = arr1 << 2 | arr2 >> 4
        // 上面的操作 arr1向左边移动2位 变为10101100
        // arr2 向右移动4位：00000010
        // | 为'与'操作: 10 101110
        int8[p++] = arr2 << 4 | arr3 >> 2
        int8[p++] = arr3 << 6 | arr4

    }
    // console.log(int8);
    let str = ''
   

    for(let i =0 ; i < int8.length-1;i++){
        if(int8[i]<0){
            let data = (255 + int8[i] + 1).toString(16)
            if(data.length<2){
                data = '0'+data
            }
            str += data
        }else{
            let data = int8[i].toString(16)
            if(data.length<2){
                data = '0'+data
            }
            str += data
        }
    }
    // console.log(str);
    const timeID = setTimeout(() => {
        console.log('进入定时器');
        this.setState({
          upload:false
        })
         this._renderWriteView(BluetoothManager.writeWithResponseCharacteristicUUID ,this.write, str,1);
        clearTimeout(timeID)
    }, 150);
    //下面的返回时对负数做的处理，如果直接返回int8则返回的是10进制的数组，
    //做的时候要转为16进制，可参考https://www.lmlphp.com/user/7084/article/item/351808/
  }


  

  render(){
    const {status,} = this.state
        
    return (
        <TouchableWithoutFeedback
            onPress = {() => {
                Keyboard.dismiss()
            }}
        >
            <View style = {{flex:1,backgroundColor:'#fff' ,alignItems:'center'}}>
               
                <View style = {{justifyContent:'center',alignItems:'center', marginTop:mTop(1),borderBottomWidth:1,borderBottomColor:'rgba(5,5,5,0.7)',width:'100%'} }>
                    <Text style = {styles.heardText}>显示</Text>
                    <View style ={{flexDirection:'row',height:mTop(30),alignItems:'center'}}>
                        <Text style = {{fontSize:scaleSize(18),marginBottom:mTop(7)}}>{`蓝牙连接状态:`}</Text>
                        {
                            (this.state.isConnected)?(
                                <Text style = {{fontSize:scaleSize(25),marginBottom:mTop(7),marginLeft:px(8),width:px(100),color:'blue'}}>{`${status}`}</Text>
                            ):(
                                <Text style = {{fontSize:scaleSize(25),marginBottom:mTop(7),marginLeft:px(8),width:px(100),color:'red'}}>{`${status}`}</Text>
                            )
                        }
                    </View>    
                </View>

                <View  style = {{width:'95%',height:'50%',marginTop:mTop(5),borderColor:'pink',borderWidth:1}}>
                    <FlatList 
                        style = {{flex:1}}
                        data = {this.state.read}
                        renderItem = {item => {
                            // console.log(item);
                            return <Text>{item.item}</Text>
                        }} 
                        ListFooterComponentStyle={{ flex: 1, justifyContent: 'flex-end' }}
                        ref={(flatList)=>this._flatList = flatList}
                    />
                </View>
                <View style = {{width:'95%',flexDirection:'row',alignItems:'center',height:40,marginTop:5}}>
                    <TextInput 
                        style = {{width:'85%',borderWidth:1,borderColor:'rgba(0,0,0,0.3)'}} 
                        value = {this.state.send}
                        onChangeText = {text=>{this.setState({send:text})}}
                        placeholder = '在这里输入16进制的字符串'
                    />
                    <TouchableOpacity 
                        style = {{backgroundColor:'#4aec80',width:'15%',height:'100%',justifyContent:'center'}}
                        onPress = {()=>{
                            let {read} = this.state
                            read.push(`发送的数据：${this.state.send}`)
                            this.setState({
                                read
                            })
                            

                            let time = setTimeout(()=>{
                                this._flatList.scrollToEnd()
                                this._renderWriteView(BluetoothManager.writeWithResponseCharacteristicUUID ,this.write, this.state.send);
                                clearTimeout(time)
                            },20)
                        }}
                    >
                        <Text style = {{textAlign:'center',color:'#fff'}}>发送</Text>
                    </TouchableOpacity>
                </View>

                <View style = {{width:'95%',flexDirection:'row',alignItems:'center',height:40,marginTop:5}}>
                    <TextInput 
                        style = {{width:'20%',borderWidth:1,borderColor:'rgba(0,0,0,0.3)'}} 
                        value = {this.state.kong}
                        onChangeText = {text=>{this.setState({kong:text})}}
                        placeholder = '控制字'
                    />
                    <TextInput 
                        style = {{width:'65%',borderWidth:1,borderColor:'rgba(0,0,0,0.3)'}} 
                        value = {this.state.kong_data}
                        onChangeText = {text=>{this.setState({kong_data:text})}}
                        placeholder = '数据位'
                    />
                    <TouchableOpacity 
                        style = {{backgroundColor:'#4aec80',width:'15%',height:'100%',justifyContent:'center'}}
                        onPress = {()=>{
                            const time = setTimeout(()=>{
                                this.sendStrData(this.state.kong,this.state.kong_data)
                            },5)
                            
                        }}
                    >
                        <Text style = {{textAlign:'center',color:'#fff'}}>发送</Text>
                    </TouchableOpacity>
                </View>
                
              
                <View >
                    {/* 按钮 */}
                    <View style = {{flexDirection:'row' , justifyContent:'space-around' , marginTop:mTop(15)}}>
                        <TouchableOpacity 
                            style = {{width:px(70) , height:mTop(35),backgroundColor:'#E1206D' ,justifyContent:'center',alignItems:'center',margin:5}}
                            onPress = {() => {
                                this._scanBlue()
                            }}
                        >
                            <Text style = {{color:'#fff'}}>连接</Text>
                        </TouchableOpacity>
                      
                        <TouchableOpacity 
                            style = {{width:px(70) , height:mTop(35),backgroundColor:'#E1206D' ,justifyContent:'center',alignItems:'center',margin:5}}
                            onPress = {() => {
                                this.setState({
                                    read:[],
                                    send:''
                                })
                            }}
                        >
                            <Text style = {{color:'#fff'}}>清空信息</Text>
                        </TouchableOpacity>

                        
                        

                   
                        
                    </View>

                    <View style = {{flexDirection:'row' , justifyContent:'space-around' , marginBottom:mTop(20)}}>
                        <TouchableOpacity 
                            style = {{width:px(120) , height:mTop(35),backgroundColor:'#E1206D' ,justifyContent:'center',alignItems:'center',margin:5}}
                            onPress = {() => {
                               const time = setTimeout(()=>{
                                 //我这里是当命令为AA037F7c55进入空中升级状态，根据自己的通信协议做对应的更改
                                 this._renderWriteView(BluetoothManager.writeWithResponseCharacteristicUUID ,this.write, 'AA037F7c55');
                                    clearTimeout(time)
                               })
                            }}
                        >
                            <Text style = {{color:'#fff'}}>进入空中升级</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style = {{width:px(120) , height:mTop(35),backgroundColor:'#E1206D' ,justifyContent:'center',alignItems:'center',margin:5}}
                            onPress = {() => {
                                try {
                                  DocumentPicker.pick({
                                    type:DocumentPicker.types.allFiles
                                  }).then(res=>{
                                    console.log('----------------',res);
                                    RNFS.readFile(`${res.uri}`,'base64' )
                                    .then(res=>{
                                      console.log('*************************');
                                      console.log(res);
                                      this._base64to2(res)
                            
                                    })
                                    .catch(err=>{
                                        console.log('err',err);
                                    })
                                  })

                                }catch(err){
                                  console.log(err);
                                }
                            }}
                        >
                            <Text style = {{color:'#fff'}}>选择文件并升级</Text>
                        </TouchableOpacity>
                    </View>
                    
                   
                </View>
                
                
                
               
                {/* 权限的弹窗 */}
                <Modal
                    visible = {this.state.isError}
                    transparent = {true}
                >
                    
                <View style = {{flex:1,backgroundColor:'rgba(0,0,0,0.6)' , justifyContent:'center' , alignItems:'center'}}>
                    <View style = {styles.errModleView}>
                        <Text style = {styles.errModleText}>{this.state.errText}</Text>
                        <View style ={{flexDirection:'row' , justifyContent:'space-evenly' , width:'100%'}}>
                            <TouchableOpacity 
                                style = {styles.onPresHaddn}
                                onPress = {() => {
                                    this.setState({
                                        isError:false
                                    })
                                }}
                                >
                                <Text style = {styles.onpresshaddonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style = {styles.onPresHaddn}
                                onPress = {this._openAppSetting}
                            >
                                <Text style = {styles.onpresshaddonText}>跳转到设置</Text>
                            </TouchableOpacity>
                        
                        </View>
                        
                    </View> 
                </View> 
                </Modal>

                {/* 打开定位的弹窗 */}
                <Modal
                    visible = {this.state.islocation}
                    transparent = {true}
                >
                    
                <View style = {{flex:1,backgroundColor:'rgba(0,0,0,0.6)' , justifyContent:'center' , alignItems:'center'}}>
                    <View style = {styles.locationModleView}>
                        <Text style = {styles.errModleText1}>{this.state.errText}</Text>
                        <View style ={{flexDirection:'row' , justifyContent:'space-evenly' , width:'100%'}}>
                            <TouchableOpacity 
                                style = {styles.onPresHaddn}
                                onPress = {() => {
                                    this.setState({
                                        islocation:false
                                    })
                                }}
                                >
                                <Text style = {styles.onpresshaddonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style = {styles.onPresHaddn}
                                onPress = {() => {
                                            console.log('确认按钮点击');
                                            SystemSetting.switchLocation(async () => {
                                            await console.log('dakai')
                                            })
                                            this.setState({islocation:false})
                                        }
                                        }
                            >
                                <Text style = {styles.onpresshaddonText}>跳转到设置</Text>
                            </TouchableOpacity>
                        
                        </View>
                        
                    </View> 
                </View> 
                </Modal>
                {/* upload:false */}
                <Modal
                    visible = {!this.state.upload}
                    // visible = {true}
                    transparent = {true}
                >
                    
                <View style = {{flex:1,backgroundColor:'rgba(0,0,0,0.6)' , justifyContent:'center' , alignItems:'center'}}>
                    <View style = {styles.locationModleView}>
                      <ActivityIndicator  size="large"/>
                        <Text style = {styles.errModleText1}>{'升级大概需要1分钟左右，请稍等。。。'}</Text>
                    </View> 
                </View> 
                </Modal>
            </View>
            
        </TouchableWithoutFeedback>
    );
  }
}
const styles = StyleSheet.create({
    onPresHaddn: {
        height: 50,
        width: px(140),
        borderRadius: 50,
        borderColor: '#FFFFFF',
        // borderWidth: 2
        backgroundColor:'#E1206D',
        backgroundColor:'#E1206D',
        
      },
      onpresshaddonText:{
          color:'#fff',
          fontSize:scaleSize(15),
          height:'100%',
          width:'100%',
          textAlign:'center',
          textAlignVertical:'center'
      },
    errModleText1: {
        fontSize:scaleSize(15),
        lineHeight:22,
        marginTop:mTop(8),
        marginBottom:mTop(10),
        width:px(250),
        height:px(70),
        // backgroundColor:'pink',
        textAlign:'center',
        textAlignVertical:'center'
      },
    locationModleView :{
        height:px(250),
        width:px(310),
        backgroundColor:'#fff',
        justifyContent:'center' , 
        alignItems:'center',
        borderRadius:14
      },
    heardText : {
        fontSize:scaleSize(25),
        marginBottom:mTop(10),
        width:'100%',
        textAlign:'center'
    },
    textS:{
        fontSize:scaleSize(18),
        width:px(240),
        borderBottomWidth:1,
    },
    textView:{
        flexDirection:'row',
        marginBottom:mTop(7),
        // backgroundColor:'pink'
    },
    breed: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomColor: '#CAC6C6',
        borderBottomWidth: 1,
        // paddingBottom: 5,
        backgroundColor:'red',
        // alignItems:'flex-start',
        width:px(300),
        marginTop:mTop(7),
        // height:px(30)
    },
    round:{
        width:mTop(11),
        height:mTop(11),
        borderWidth:px(1),
        marginRight:px(10),
        borderRadius:mTop(20),
        borderColor:'#555'
    },
    nameView: {
        width:px(375),
        marginTop:mTop(10),
        paddingLeft: px(30),
        paddingRight: px(30),
        flexDirection:'row',
        alignItems:'center',
        justifyContent:'center',
      },
      errModleView :{
        height:px(310),
        width:px(310),
        backgroundColor:'#fff',
        justifyContent:'center' , 
        alignItems:'center',
        borderRadius:14
      },
      locationModleView :{
        height:px(250),
        width:px(310),
        backgroundColor:'#fff',
        justifyContent:'center' , 
        alignItems:'center',
        borderRadius:14
      },
      errModleIcon:{
        fontFamily:'iconfont' , 
        fontSize:scaleSize(40),
        color:'#E1206D'
      },
      onPresHaddn: {
        height: 50,
        width: px(140),
        borderRadius: 50,
        borderColor: '#FFFFFF',
        // borderWidth: 2
        backgroundColor:'#E1206D',
        backgroundColor:'#E1206D',
        
      },
      onpresshaddonText:{
          color:'#fff',
          fontSize:scaleSize(15),
          height:'100%',
          width:'100%',
          textAlign:'center',
          textAlignVertical:'center'
      },
      errModleText: {
        fontSize:scaleSize(15),
        lineHeight:22,
        marginTop:mTop(8),
        marginBottom:mTop(10),
        width:px(250),
        height:px(140),
        // backgroundColor:'pink',
        textAlign:'center',
        textAlignVertical:'center'
      },
      errModleText1: {
        fontSize:scaleSize(15),
        lineHeight:22,
        marginTop:mTop(8),
        marginBottom:mTop(10),
        width:px(250),
        height:px(70),
        // backgroundColor:'pink',
        textAlign:'center',
        textAlignVertical:'center'
      },
});