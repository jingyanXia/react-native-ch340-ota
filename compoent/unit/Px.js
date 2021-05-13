
// import {PixelRatio , DeviceInfo , Dimensions} from 'react-native';

// const dp2px = dp=>PixelRatio.getPixelSizeForLayoutSize(dp);
// const px2dp = px=>PixelRatio.roundToNearestPixel(px);

// // const size = 1.0/DeviceInfo.Dimensions.screen.fontScale
// const fontSizeScaler = PixelRatio.get()/PixelRatio.getFontScale()
 
// // 设备宽度，单位 dp
// const deviceWidthDp = Dimensions.get('window').width;
 
// // 设计稿宽度（这里为640px），单位 px
// const uiWidthPx = 375;
 
// // px 转 dp（设计稿中的 px 转 rn 中的 dp）
// export const px = (uiElePx) => {
//  return px2dp(uiElePx * deviceWidthDp / uiWidthPx);
// }


// export const sz = (x) => {
//     return x*fontSizeScaler*0.37
// }



import {PixelRatio , DeviceInfo , Dimensions} from 'react-native';

const dp2px = dp=>PixelRatio.getPixelSizeForLayoutSize(dp);
const px2dp = px=>PixelRatio.roundToNearestPixel(px);

// const size = 1.0/DeviceInfo.Dimensions.screen.fontScale
const fontSizeScaler = PixelRatio.get()/PixelRatio.getFontScale()
 
// 设备宽度，单位 dp
const deviceWidthDp = Dimensions.get('window').width;
const deviceHight = Dimensions.get('window').height
 
// 设计稿宽度（这里为640px），单位 px
const uiWidthPx = 375;
const uihight = 666
 
// px 转 dp（设计稿中的 px 转 rn 中的 dp）
export const px = (uiElePx) => {
 return px2dp(uiElePx * deviceWidthDp / uiWidthPx);
}
export const mTop = (uiElePx) => {
    return px2dp(uiElePx *deviceHight / uihight);
   }



export const sz = (x) => {
    return x*fontSizeScaler*0.37
}












/**
 * Created by zhuoy on 2017/6/27.
 * 屏幕工具类
 * ui设计基准,iphone 6
 * width:750
 * height:1334
 */
 
/*
 设备的像素密度，例如：
 PixelRatio.get() === 1          mdpi Android 设备 (160 dpi)
 PixelRatio.get() === 1.5        hdpi Android 设备 (240 dpi)
 PixelRatio.get() === 2          iPhone 4, 4S,iPhone 5, 5c, 5s,iPhone 6,xhdpi Android 设备 (320 dpi)
 PixelRatio.get() === 3          iPhone 6 plus , xxhdpi Android 设备 (480 dpi)
 PixelRatio.get() === 3.5        Nexus 6       */

 
 
export const deviceWidth = Dimensions.get('window').width;      //设备的宽度
export const deviceHeight = Dimensions.get('window').height;    //设备的高度
let fontScale = PixelRatio.getFontScale();                      //返回字体大小缩放比例
 
let pixelRatio = PixelRatio.get();      //当前设备的像素密度
const defaultPixel = 2;                           //iphone6的像素密度
//px转换成dp
const w2 = 375 / defaultPixel;
const h2 = 666 / defaultPixel;
const scale = Math.min(deviceHeight / h2, deviceWidth / w2);   //获取缩放比例
/**
 * 设置text为sp
 * @param size sp
 * return number dp
 */
export const setSpText = function (size) {
    size = Math.round((size * scale + 0.5) * pixelRatio / fontScale);
    return size / defaultPixel;
}
 
export const scaleSize = (size) => {
 
    size = Math.round(size * scale + 0.5);
    return size / defaultPixel;
}