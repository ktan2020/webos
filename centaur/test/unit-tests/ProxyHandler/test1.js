
include("prototype_triton.js");
include("ProxyHandler.js");

function main() {
    
    var defaultList = [
        {
            title:"Huffington Post",
            url:"http://feeds.huffingtonpost.com/huffingtonpost/raw_feed",
            type:"atom", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"Google",
            url:"http://news.google.com/?output=atom",
            type:"atom", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"BBC News",
            url:"http://newsrss.bbc.co.uk/rss/newsonline_world_edition/front_page/rss.xml",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"New York Times",
            url:"http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"MSNBC",
            url:"http://rss.msnbc.msn.com/id/3032091/device/rss/rss.xml",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"National Public Radio",
            url:"http://www.npr.org/rss/rss.php?id=1004",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"Slashdot",
            url:"http://rss.slashdot.org/Slashdot/slashdot",
            type:"rdf", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"Engadget",
            url:"http://www.engadget.com/rss.xml",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"The Daily Dish",
            url:"http://feeds.feedburner.com/andrewsullivan/rApM?format=xml",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"Guardian UK",
            url:"http://feeds.guardian.co.uk/theguardian/rss",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"Yahoo Sports",
            url:"http://sports.yahoo.com/top/rss.xml",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"ESPN",
            url:"http://sports-ak.espn.go.com/espn/rss/news",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"Ars Technica",
            url:"http://feeds.arstechnica.com/arstechnica/index?format=xml",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        },{
            title:"Nick Carr", 
            url:"http://feeds.feedburner.com/roughtype/unGc",
            type:"rss", value:false, numUnRead:0, newStoryCount:0, stories:[]
        }
    ];
                
    var testList = [
        {
            title:"Hacker News",
            url:"http://news.ycombinator.com/rss",
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Ken Rosenthal",
            url:"http://feeds.feedburner.com/foxsports/rss/rosenthal",
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"George Packer",
            url:"http://www.newyorker.com/online/blogs/georgepacker/rss.xml",
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Palm Open Source",
            url:"http://www.palmopensource.com/tmp/news.rdf",
            type:"rdf", value:false, numUnRead:0, stories:[]
        },{
            title:"Washington Post",
            url:"http://feeds.washingtonpost.com/wp-dyn/rss/linkset/2005/03/24/LI2005032400102_xml",
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Baseball Prospectus", 
            url:"http://www.baseballprospectus.com/rss/feed.xml", 
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Peter Gammons", 
            url:"http://sports.espn.go.com/keyword/search?searchString=gammons_peter&feed=rss&src=rss&filter=blog", 
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"McCovey Chronicles", 
            url:"http://feedproxy.google.com/sportsblogs/mccoveychronicles.xml", 
            type:"atom", value:false, numUnRead:0, stories:[]
        },{
            title:"The Page", 
            url:"http://feedproxy.google.com/time/thepage?format=xml", 
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Salon",
            url:"http://feeds.salon.com/salon/index", 
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Slate", 
            url:"http://feedproxy.google.com/slate?format=xml", 
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"SoSH", 
            url:"http://sonsofsamhorn.net/index.php?act=rssout&id=1", 
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Talking Points Memo", 
            url:"http://feeds.feedburner.com/talking-points-memo", 
            type:"atom", value:false, numUnRead:0, stories:[]
        },{
            title:"Whatever", 
            url:"http://scalzi.com/whatever/?feed=rss2", 
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Baseball America", 
            url:"http://www.baseballamerica.com/today/rss/rss.xml", 
            type:"rss", value:false, numUnRead:0, stories:[]
        },{
            title:"Test RDF Feed", 
            url:"http://foobar.blogalia.com/rdf.xml", 
            type:"rdf", value:false, numUnRead:0, stories:[]
        },{
            title:"Daily Kos", 
            url:"http://feeds.dailykos.com/dailykos/index.html", 
            type:"rss", value:false, numUnRead:0, stories:[]
        }
    ];
        
                
    var handler = new ProxyHandler();
    startApplicationLoop();
     
    defaultList.each(function(a) {
        if (a) {
            console.log("==> url: " + a.url + " <==");
            console.log("==> URL: " + encodeURIComponent(a.url) + " <==");
            
            var path = "/proxy?proxy=" + encodeURIComponent(a.url);
            console.log("path: (" + path + ")");
            
            var h = $H();
            h.set("query", path.toQueryParams());          
            
            //handler.doGET($H(), h);
        }
    });    
    
}
