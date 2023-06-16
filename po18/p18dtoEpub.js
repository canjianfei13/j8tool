let paa = ""
let content = []
let option = {}
import {
    epub
} from "./index.js"
import axios from "axios"
import yargs from "yargs"
import cheerio from "cheerio"
let headers = {
    "x-requested-with": "XMLHttpRequest",
    "cookie": '',
    "Referer": "https://www.po18.tw",
    proxy: false
}


async function downp18() {
    for (let bid of process.argv.slice(2)) {
        const detail = await getdetail(bid);
        if (detail) {
            option = Object.assign({}, detail);
            paa = `./${detail.title}.txt`           
            delete detail.desccc
            console.log(detail);
            await getCon(detail);
            console.log("开始生成epub")
            console.log(option)
            await new epub(option);
        }
    }
}

function getContent(bid, pid, ii) {
    return new Promise(async resolve => {
        try {      
            headers.referer = `https://www.po18.tw/books/${bid}/articles/${pid}`;
            const response = await axios.get(`https://www.po18.tw/books/${bid}/articlescontent/${pid}`, {headers});
            let r = response.data.replace(/ &nbsp;&nbsp;/g, "");
            const $ = cheerio.load(r);
            $("blockquote").remove();
            let name = $("h1").text()
            $("h1").remove();
            option.content[ii] = {
                title: name,
                data: $("body").html().replaceAll("<p>","").replaceAll("</p>","\n")
            }
        } catch (err) {
            console.log(err)
            console.log("重新请求中");
            await getContent(bid, pid, ii);
        }
        resolve()
    })
}


//task()    
async function getCon(detail) {
    const urls = Array.from({
        length: detail.pageNum
    }, (_, i) => `https://www.po18.tw/books/${detail.bid}/articles?page=${i + 1}`);
    let k = 0;
    for (const url of urls) {
        console.log(`第${urls.indexOf(url) + 1}页`);
        const {data} = await axios.get(url, {headers});
        const $ = cheerio.load(data);
        const list = $('#w0>div');
        console.log(list.length);
        await Promise.all(
            list.toArray().map((li) => {
                const name = $(".l_chaptname", li).text();
                console.log(`${k}.${name}`);
                if ($(li).text().match(/訂購/)) {
                    console.log('    请购买');
                    return Promise.resolve();
                } else {
                    console.log("    下载中...");
k++
                    const href = $(".l_btn>a", li).attr('href');
                    const id = href.split('/');
                    return getContent(id[2], id[4], k, option).then(() => {});
                }
            })
        );
    }
}


function getdetail(bid) {
    return new Promise(async resolve => {
        try {
            //     console.log(bid)
            let r = await axios.get(`https://www.po18.tw/books/${bid}`, {headers});
            let $ = cheerio.load(r.data);
            let zh = $("dd.statu").text().match(/\d+/)
            let detail = {
                title: $("h1.book_name").text().split(/（|【|\(/)[0],
                author: $("a.book_author").text(),
                cover: $('.book_cover>img').attr("src"),
                description: $('.B_I_content').text(),
                content: [],             
                bid,
                pageNum: Math.ceil(zh / 100)
            };
            console.log($("a.book_author").text())
            resolve(detail)
        } catch (err) {
            console.log(err)
            console.log("请求出错")
            console.log(err.response.status)
            console.log(err.response.statusText)
        }
        resolve()
    })
}

downp18()