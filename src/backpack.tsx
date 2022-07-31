import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

//@ts-ignore
const doy = Math.floor((Date.now() - Date.parse(new Date().getFullYear(), 0, 0)) / 86400000)

// document.querySelector(".bg-layer-1")?.classList.add("bg-" + Math.floor(Math.random() * 6 + 1))
interface bookmarkItem {
  url: string;
  title: string;
  id: string;
  index: string;
  parentId: number;
  folder: string;
}

interface foldersI {
  [key: string]: any;
}
const folders: foldersI = {}

const Backpack = () => {
  const [search, setSearch] = useState<string>("");
  const [bm, setBm] = useState<bookmarkItem[]>([]);
  const [bmr, setBmr] = useState<bookmarkItem[]>([]);
  const [favs, setFavs] = useState<bookmarkItem[]>([]);
  const [readingList, setReadingList] = useState<bookmarkItem[]>([]);
  const [finished, setFinished] = useState<boolean>(false);
  const [skipVr, setSkipVr] = useState<number | null>(null);
  const [skipVs, setSkipVs] = useState<number | null>(null);

  useEffect(() => {
    chrome.storage.sync.get(['skipVr'], function (result) {
      if (!result.skipVr) {
        chrome.storage.sync.set({ skipVr: 100 }, function () {
          setSkipVr(100)
          console.log('Value is set to ' + skipVr);
        });
      } else {
        console.log('Value is set to ' + result.skipVr);
        setSkipVr(result.skipVr)
      }
    });

    chrome.storage.sync.get(['skipVs'], function (result) {
      if (!result.skipVs) {
        chrome.storage.sync.set({ skipVs: 100 }, function () {
          setSkipVs(100)
          console.log('Value is set to ' + skipVs);
        });
      } else {
        console.log('Value is set to ' + result.skipVs);
        setSkipVs(result.skipVs)
      }
    });

    let openProcesses = 0
    function process_bookmark(bookmarks: any): any {
      openProcesses += 1

      let _: bookmarkItem[] = [];
      let _favs: bookmarkItem[] = [];
      let _readingList: bookmarkItem[] = [];

      for (var i = 0; i < bookmarks.length; i++) {
        var bookmark = bookmarks[i];
        if (bookmark.url) {
          let folder = "none";
          if (bookmark.parentId) {
            folder = folders[bookmark.parentId]
          }
          const item = {
            url: bookmark.url,
            title: bookmark.title,
            id: bookmark.id,
            index: bookmark.index,
            parentId: bookmark.parentId,
            folder
          }
          if (["favorites"].includes(item.folder)) {
            _favs.push(item)
          } else if (["reading list"].includes(item.folder)) {
            _readingList.push(item)
          } else {
            _.push(item)
          }
        } else if (bookmark.children) {
          if (bookmark.id) {
            folders[bookmark.id] = bookmark.title
          }
          process_bookmark(bookmark.children);
        }
      }
      setFavs(prev => [...prev, _favs].flat(3))
      setReadingList(prev => [...prev, _readingList].flat(3))
      setBm(prev => [...prev, _].flat(3))
      openProcesses -= 1
      //randomise at end
      if (openProcesses === 0) {
        setFinished(true)
        setBmr(() => [...bm].sort((a, b) => 0.5 - Math.random()))
      }
    }

    chrome.bookmarks.getTree(process_bookmark);
  }, []);

  const matchesSearch = (e: bookmarkItem) => {
    if (search === "") return true
    let match = false;
    const url = e.url;
    const title = e.title;
    const folder = e.folder;
    [url,
      title,
      folder,].forEach(f => {
        if (f.includes(search))
          match = true
      })
    console.log(search, e, e.title.includes(search))
    return match
  }

  useEffect(() => {
    if (finished) {
      setBmr(() => [...bm].sort((a, b) => 0.5 - Math.random()))
      // setReadingList(() => [...readingList].sort((a, b) => 0.5 - Math.random()))
    }
  }, [bm, finished])

  const removeBookmark = (bookmark: bookmarkItem) => {
    const id = bookmark.id.toString();
    console.log(bookmark)
    try {
      chrome.bookmarks.remove(
        id,
        () => {
          setFavs((prev) => {
            const temp = [...prev];
            const idx = temp.findIndex(el => el.index > id);
            temp.splice(idx, 1);
            return temp
          })
          setBm((prev) => {
            const temp = [...prev];
            const idx = temp.findIndex(el => el.index > id);
            temp.splice(idx, 1);
            return temp
          })
          console.log("bookmark removed", id)
        }
      )
    } catch (error) {
      console.log("cant remove this bookmark", id, error)
    }
  }
  const ignoreBookmark = (which: string) => {
    console.log({ which })
    chrome.storage.sync.get(which, function (result) {
      console.log({ result })
      chrome.storage.sync.set({ [which]: result[which] + 1 }, function () {
        which === "skipVr" ? setSkipVr(result[which] + 1) : setSkipVs(result[which] + 1);
        console.log('Value is set to ' + result[which] + 1);
      });
    })
  }
  const today = skipVr && readingList.length ? readingList[Math.floor(doy * skipVr % readingList.length)] : null
  const sponsor = skipVs && bm.length ? bm[Math.floor(doy * skipVs % bm.length)] : null

  return (
    <div className="main">
      <nav>
        <p>BMNN</p>
        <input value={search} onChange={(e) => setSearch(e.target.value)} type="search" name="search" id="search" />
        <p className="stats">links in "favorites","reading list" folders are shown first. (total: {bm.length} -  {bm.filter(e => e.parentId == 1).length} undeletable, put them in a folder)</p>
        <p className="stats"></p>
      </nav>
      <div className="card-container">
        <div className="hero">
          <div className="card headline">
            <h1>Today's Headline {today && <span>
              <a style={{ color: "orange" }} href={today.url}>↗ {today.title}</a>{today && today.parentId != 1 ? <button style={{ display: "inline" }} onClick={() => removeBookmark(today)}>✖</button> : <button onClick={() => chrome.tabs.create({ url: "chrome://bookmarks/?q=" + today.title })}>✖</button>}
              <span onClick={() => ignoreBookmark("skipVr")}>skip</span>
            </span>}
            </h1>

          </div>
          <div className="card sponsor">
            <h2>Sponsored: {sponsor && <span>
              <a style={{ color: "teal" }} href={sponsor.url}>↗ {sponsor.title}</a>{sponsor && sponsor.parentId != 1 ? <button style={{ display: "inline" }} onClick={() => removeBookmark(sponsor)}>✖</button> : <button onClick={() => chrome.tabs.create({ url: "chrome://bookmarks/?q=" + sponsor.title })}>✖</button>}
              <span onClick={() => ignoreBookmark("skipVs")}>skip</span>
            </span>}</h2>
          </div>
        </div>
        <div className="cards">

          { //@ts-ignore
            favs.filter(matchesSearch).map((bookmark, i) => (
              <div key={`el-${bookmark.parentId}-${bookmark.id}`} id={`el-${bookmark.parentId}-${bookmark.id}`} className="card card-favs">
                <a href={bookmark.url}>
                  ↗ {bookmark.title} <br />
                  <span >
                    <span className="card-folder">{bookmark.folder}</span> <span className="card-link">{bookmark.url}</span>
                  </span>
                </a>
                {bookmark.parentId != 1 ? <button onClick={() => removeBookmark(bookmark)}>✖</button> : ""}
              </div>))
          }

          { //@ts-ignore
            readingList.filter(matchesSearch).map((bookmark, i) => (
              <div key={`el-${bookmark.parentId}-${bookmark.id}`} id={`el-${bookmark.parentId}-${bookmark.id}`} className="card card-reading-list">
                <a href={bookmark.url}>
                  ↗ {bookmark.title} <br />
                  <span >
                    <span className="card-folder">{bookmark.folder}</span> <span className="card-link">{bookmark.url}</span>
                  </span>
                </a>
                {bookmark.parentId != 1 ? <button onClick={() => removeBookmark(bookmark)}>✖</button> : ""}
              </div>))
          }


          { //@ts-ignore
            bmr.filter(matchesSearch).map((bookmark) => (
              <div key={`el-${bookmark.parentId}-${bookmark.id}`} id={`el-${bookmark.parentId}-${bookmark.id}`} className="card">
                <a href={bookmark.url}>
                  ↗ {bookmark.title} <br />
                  <span >
                    <span className="card-folder">{bookmark.folder}</span> <span className="card-link">{bookmark.url}</span>
                  </span>
                </a>
                {bookmark.parentId != 1 ? <button onClick={() => removeBookmark(bookmark)}>✖</button> : <button onClick={() => chrome.tabs.create({ url: "chrome://bookmarks/?q=" + bookmark.title })}>✖</button>}
              </div>))
          }
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(
  <Backpack />,
  document.getElementById("root")
);
