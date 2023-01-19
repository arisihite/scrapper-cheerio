const cheerio = require('cheerio');
const fs = require('fs');
const axios = require('axios');


const getBodyUrl = async link => {
    const response = await axios.get(link);
    return cheerio.load(response.data);
}

const driver = async (outputFile,link,host) => {
    try {
        let result = {};   
        const $ = await getBodyUrl(link);
        let requestCat = [];
        $("div #subcatpromo").each((i, value) => {
            $(value).find('div').each((j, data) => {
                let title = $(data).find('img').attr('title');
                result[title] = null;
                let id = $(data).find('img').attr('id');
                let linkCat = host+"/"+getUrlCat($,id);
                requestCat.push(ajaxCatUrl(linkCat,title,host));
            });
        });

        await Promise.all(requestCat).then((values) => {
            values.forEach(element => {
                result[element.title] = element.result;
            })
        });  
        
        exportResults(outputFile,result);
        
    } catch (error) {
        console.error(error);
      }
}

// get url from onclick function
const getUrlCat = ($,id) => {
    let $script = $('#contentpromolain2 div script')[0].childNodes[0].data;
    let regex = new RegExp("\\$\\(\"(#"+id+")\"\\)\\.click(?:.|\\n)+?\\.load\\(\"(.+?)\"");
    let match;
    if (match = regex.exec($script)) {
       return match[2];
    }
};

// get total page number
const getTotalPage = ($) => {
    let $script = $('.page_promo_lain');
    let totalWritten = $($script[$script.length-1]).attr('title');
    let num = totalWritten.match(/\d+/g);
    return parseInt(num[1]);
};

// execute get request for each category promo
const ajaxCatUrl = async (linkCat,title,host) => {
    let contents = [];
    try {
        let $ = await getBodyUrl(linkCat);
        let content = await getCatPromoDesc($,host);
        
        contents = contents.concat(content);
        let totalPage = getTotalPage($);

        for (let i = 2 ; i <= totalPage; i++){
            let nextLink = linkCat + "&page=" + i;
            $ = await getBodyUrl(nextLink);
            content = await getCatPromoDesc($,host);
            contents = contents.concat(content);
        }

        return {
            title : title,
            result : contents
        };
    }catch (error){
        console.log(error);
    }
}

// get all promo appear in window
const getFromDetailSite = async (linkDetail,host) => {
    const $2 = await getBodyUrl(linkDetail);
    let periode = "";
    $2('.periode b').each(function(i, element) {
        periode += $2(element).text()
    });

    let results = {
        title : $2('.titleinside h3').text(),
        area : $2('.area b').text(),
        periode : periode,
        imageurl : host+$2('.keteranganinside img').attr('src')
    }

    return results;
}

// get detail for each promotion
const getCatPromoDesc = async ($,host) => {
    let result = [];
    let requests = [];

    $('#promolain li').each((i, element) => {
        let href = $(element).find('a').attr('href');
        var pattern = new RegExp("https");
        if(pattern.test(href)){
            requests.push(getFromDetailSite(href,host));
        }else{
            requests.push(getFromDetailSite(host+"/"+href,host));
        }
    });

    await Promise.all(requests).then((values) => {
        result = result.concat(values);
    }); 

    return result;  
};

//write to json
const exportResults = (outputFile,parsedResults) => {
    fs.writeFile(outputFile, JSON.stringify(parsedResults, null, 4), (err) => {
      if (err) {
        console.log(err)
      }
    })
  }



// Main driver
const output = 'solution.json';
const url = 'https://www.bankmega.com/promolainnya.php';
const hostName = url.match(/https:\/\/(.+?).com/)[0];
driver(output,url,hostName);