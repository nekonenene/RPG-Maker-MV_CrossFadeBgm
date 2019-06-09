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

以下のコマンドでクロスフェードを開始します。

```
CrossFadeBgm start 0.3,Ship1,90,0,100
```

フェード時間,BGM名,音量,パン,ピッチの順にカンマで分けて書きます。  
**カンマのあとに空白スペースを書いてはいけません** のでご注意を。

曲名以外は省略することが可能で、省略した場合は、  
フェード時間はデフォルトのものが使われ、  
他の値は、現在流れている曲のものが使われます。

```
CrossFadeBgm start _,Ship1,90,0
```


## 注意点

ツクールでの「デプロイメント」でゲームを出力するとき、 **「未使用ファイルを含まない」** のチェックをONにした場合、  
ツクールはプラグインコマンドでどのBGMが使われてるのかまでは見ませんので、  
本当は使っているのに、使ってないとみなされてBGMファイルが出力されない場合があります。

これではそのBGMを再生しようとしたときエラーが発生してしまいます。

対策としては、「未使用ファイルを含まない」のチェックをOFFでデプロイメントするか、  
ダミーのマップを用意して、出力されないBGMを演奏するイベントをそこに置くとよいかと思います。


## 作者情報

ハトネコエ  
**[Twitter : @nekonenene](https://twitter.com/nekonenene)**  
HP : http://hato-neko.x0.com

バグ報告や要望など、ぜひぜひ [Twitter](https://twitter.com/nekonenene) や [GitHub issue](https://github.com/nekonenene/RPG-Maker-MV_CrossFadeBgm/issues) にお寄せください。
