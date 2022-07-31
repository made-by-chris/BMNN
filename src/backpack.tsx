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
  const [finished, setFinished] = useState<boolean>(false);

  useEffect(() => {
    let openProcesses = 0
    function process_bookmark(bookmarks: any): any {
      openProcesses += 1
      let _: bookmarkItem[] = []
      let prio: any = []
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
            prio.push(item)
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
      setFavs(prev => [...prev, prio].flat(3))
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
    console.log(e)
    const url = e.url;

    // if (typeof f.value === 'string') {
    //   result = doesStringContainsKeyword(row[name], f.value)
    //   console.log({ result })
    // }
    // e.url.includes(e) || e.title.includes(e) || e.folder.includes(e)
  }

  useEffect(() => {
    if (finished) {
      setBmr(() => [...bm].sort((a, b) => 0.5 - Math.random()))
    }
  }, [bm, finished])
  useEffect(() => {
    console.log(search)
  }, [search])

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
  const today = bm.length ? bm[Math.floor(doy * 123 % bm.length)] : null

  return (
    <div>

      <nav>
        <p>BMNN</p>
        <input value={search} onChange={(e) => setSearch(e.target.value)} type="search" name="search" id="search" />
        <p>links in "favorites" folder are shown first.</p>
        <p>bookmarks: {bm.length} </p>
        <p>({bm.filter(e => e.parentId == 1).length} undeletable - put them in a folder)</p>
      </nav>
      <div className="card-container">
        <div className="card card-title">
          <h1>Today's Headline {today && <span><a style={{ color: "orange" }} href={today.url}>↗ {today.title}</a>{today && today.parentId != 1 ? <button style={{ display: "inline" }} onClick={() => removeBookmark(today)}>✖</button> : <button disabled onClick={() => removeBookmark(today)}>✖</button>}</span>}</h1>
        </div>

        { //@ts-ignore
          favs.filter(matchesSearch).map((bookmark, i) => (
            <div key={`el-${bookmark.parentId}-${bookmark.id}`} id={`el-${bookmark.parentId}-${bookmark.id}`} className="card card-favs">
              <a href={bookmark.url}>
                ↗ {bookmark.title} <br />
                <span> <span className="card-folder">{bookmark.folder}</span> <span className="card-link">{bookmark.url}</span> </span>
              </a>
              {bookmark.parentId != 1 ? <button onClick={() => removeBookmark(bookmark)}>✖</button> : ""}
            </div>))
        }


        { //@ts-ignore
          bmr.filter(e => search === "" || e.url.includes(e) || e.title.includes(e) || e.folder.includes(e)).map((bookmark) => (
            <div key={`el-${bookmark.parentId}-${bookmark.id}`} id={`el-${bookmark.parentId}-${bookmark.id}`} className="card">
              <a href={bookmark.url}>
                ↗ {bookmark.title} <br />
                <span> <span className="card-folder">{bookmark.folder}</span> <span className="card-link">{bookmark.url}</span> </span>
              </a>
              {bookmark.parentId != 1 ? <button onClick={() => removeBookmark(bookmark)}>✖</button> : <button disabled onClick={() => removeBookmark(bookmark)}>✖</button>}
            </div>))
        }
      </div>
    </div>
  );
};

ReactDOM.render(
  <Backpack />,
  document.getElementById("root")
);
