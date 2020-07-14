/*
 * @Author: Bing Xu
 * @Date: 2020-07-14 14:47:07
 * @LastEditTime: 2020-07-14 14:47:50
 * @LastEditors: Bing Xu
 * @Description: 
 * @FilePath: /node-spider/index.js
 */

const fs = require("fs");
const https = require("https");
const cheerio = require("cheerio");
const request = require("request");

const requestUrl = "https://www.mzitu.com/japan";

// 规避文件命名
const regEx = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）&;|{}【】‘；：”“'。，、？]");

// 请求头部信息
const option = {
  headers: {
    "referer": requestUrl,
    "pragma": "no-cache",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3314.0 Safari/537.36 SE 2.X MetaSr 1.0"
  }
};

// 开始请求
const requestPlay = () => {
  https.get(requestUrl, option, (res) => {
    let thisHtml = "";
    res.on("data", function (callbackDom) {
      thisHtml += callbackDom;
    });
    res.on("end", function () {
      getPage(thisHtml);
    });
  });
};

// 获取一共有多少页
const getPage = (pageDom) => {
  let $ = cheerio.load(pageDom); // 解析HTML
  let maxPage = Number($(".pagination").find(".nav-links").find(".next").prev().text()); // 总共有多少页
  let pageArr = [];
  pageArr.push(requestUrl);
  for (let i = 2; i <= maxPage; i++) {
    pageArr.push(requestUrl + "page/" + i + "/");
  }
  getPicture(0, pageArr);
};

// 获取每页里面有多少套图
const getPicture = (palyIndex, pageArr) => {
  let requestUrl = pageArr[palyIndex];
  https.get(requestUrl, option, (res) => {
    let thisPicture = "";
    res.on("data", function (callbackDom) {
      thisPicture += callbackDom;
    });
    res.on("end", function () {
      let pictureArr = [];
      let $ = cheerio.load(thisPicture);
      let pictureDom = $("#pins").find("li");
      for (let i = 0; i < pictureDom.length; i++) {
        pictureArr.push({
          name: pictureDom.eq(i).find("img").attr("alt"),
          href: pictureDom.eq(i).find("a").attr("href")
        });
      }
      requestPicture(pictureArr, 0, ++palyIndex, pageArr);
    });
  });
};

// 请求每个套图图片
const requestPicture = (Picture, pictureIndex, palyIndex, pageArr) => {
  let requestUrl = Picture[pictureIndex].href;
  https.get(requestUrl, option, (res) => {
    let thisHtml = "";
    res.on("data", function (callbackDom) {
      thisHtml += callbackDom;
    });
    res.on("end", function () {
      pictureDom(Picture, pictureIndex, palyIndex, pageArr, thisHtml);
    });
  });
};

// 处理套图里面的图片
const pictureDom = (Picture, pictureIndex, palyIndex, pageArr, thisHtml) => {
  let $ = cheerio.load(thisHtml);
  let pictureSrc = $(".main-image").find("img").attr("src"); // 获取装载图片的节点个数
  downloadImg(Picture[pictureIndex].name, pictureSrc);
  let nextPage = $(".main-image").find("a").attr("href");
  if (nextPage.indexOf(Picture[pictureIndex].href) !== -1) {
    setTimeout(() => {
      https.get(nextPage, option, function (res) {
        let thisHtml = "";
        res.on("data", function (callbackDom) {
          thisHtml += callbackDom;
        });
        res.on("end", function () {
          pictureDom(Picture, pictureIndex, palyIndex, pageArr, thisHtml);
        });
      })
    }, 3000);
  } else {
    if (++pictureIndex < Picture.length) {
      pictureDom(Picture, pictureIndex, palyIndex, pageArr, thisHtml);
    } else {
      getPicture(palyIndex, pageArr);
    }
  }
};

const dealNmae = (name) => {
  let newName = "";
  for (let i = 0; i < name.length; i++) {
    newName = newName + name.substr(i, 1).replace(regEx, '');
  }
  return newName;
};

// 下载图片
const downloadImg = (folderName, imgSrc) => {
  let newFolderName = dealNmae(folderName);
  if (!fs.existsSync(newFolderName)) {
    fs.mkdirSync(newFolderName);
  }
  let imgName = imgSrc.split("/").pop();
  request(imgSrc, option, (err, res) => {
    if (!err && res.statusCode === 200) {
      console.info("文件夹名称【" + newFolderName + "】图片链接: " + imgSrc + " 已爬取完成!");
    }
  }).pipe(fs.createWriteStream(newFolderName + "/" + imgName));

};

// 调用开始请求
requestPlay();