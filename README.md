# RPGツクールMV用プラグイン : BGM をクロスフェード

RPG Maker MV Plugin - HTN_CrossFadeBgm

## ダウンロード

**[ここを右クリックして「名前を付けてリンク先を保存」みたいな項目を選んでダウンロード](https://raw.githubusercontent.com/nekonenene/RPG-Maker-MV_CrossFadeBgm/master/HTN_CrossFadeBgm.js)**

ダウンロードした `HTN_CrossFadeBgm.js` を `js/plugins` フォルダーの中に入れてください。

プラグインの導入方法について詳しくは、ツクール公式サイトの講座ページをご覧ください！ ↓  
[RPGツクールMV 初心者講座 プラグイン編](https://tkool.jp/mv/guide/011_001.html)


## 紹介動画

[![紹介動画](https://img.youtube.com/vi/keAQciFMIxQ/0.jpg)](https://www.youtube.com/watch?v=keAQciFMIxQ)  
[↑ クリックすると YouTube に飛びます](https://www.youtube.com/watch?v=keAQciFMIxQ)


## プラグインコマンド

プラグインコマンドについて詳しくはプラグイン内のヘルプで触れていますが、ここでも少しだけ。

### 次に流すBGMの設定

```
CrossFadeBgm set Ship1,90,0,100
```

BGM名,音量,パン,ピッチの順にカンマで分けて書きます。  
**カンマのあとに空白スペースを書いてはいけません** のでご注意を。

### クロスフェードの開始

```
CrossFadeBgm start
```

上のBGMの設定が終わったらあとはこのコマンドでクロスフェードの開始です。


## 注意点

ツクールでの「デプロイメント」でゲームを出力するとき、 **「未使用ファイルを含まない」** のチェックをONにした場合、  
ツクールはプラグインコマンドでどのBGMが使われてるのかまでは見ませんので、  
本当は使っているのに、使ってないとみなされてBGMファイルが出力されない場合があります。

これではそのBGMを再生しようとしたときエラーが発生してしまいます。

対策としては、「未使用ファイルを含まない」のチェックをOFFでデプロイメントするか、  
ダミーのマップを用意して、そこに出力されないBGMを演奏するイベントを置くとかするといいと思います。


## 作者情報

ハトネコエ  
**[Twitter : @nekonenene](https://twitter.com/nekonenene)**  
HP : http://hato-neko.x0.com

バグ報告や要望など、ぜひぜひ [Twitter](https://twitter.com/nekonenene) や [GitHub issue](https://github.com/nekonenene/RPG-Maker-MV_CrossFadeBgm/issues) にお寄せください。
