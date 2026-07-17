export interface TopicDialogue {
  speaker: 'S' | 'T';
  japanese: string;
  romaji: string;
  vietnamese: string;
}

export interface KaiwaTopic {
  id: string;
  title: string;
  context: string;
  image: string; // URL or placeholder
  dialogues: TopicDialogue[];
}

export const KAIWA_TOPICS: KaiwaTopic[] = [
  {
    id: "concert",
    title: "Topic 1: Rủ cô giáo đi xem Concert Violin",
    context: "Buổi hòa nhạc Violin của Isabella Tanaka tại Sakura Hall. Điểm nổi bật là rất gần trường KAIZEN (đi bộ 3 phút), cấm chụp ảnh và cấm ăn uống.",
    image: "https://placehold.co/600x400/1e293b/a5b4fc?text=Violin+Concert+Tickets",
    dialogues: [
      { speaker: "S", japanese: "もしもし、先生ですか。[Tên bạn]です。", romaji: "Moshi moshi, sensei desu ka. [Tên bạn] desu.", vietnamese: "Alo, cô ạ? Em là [Tên bạn] đây ạ." },
      { speaker: "T", japanese: "ああ、[Tên bạn]さん、こんにちは。", romaji: "Aa, [Tên bạn]-san, konnichiwa.", vietnamese: "À, chào em." },
      { speaker: "S", japanese: "先生、今お時間がありますか。", romaji: "Sensei, ima ojikan ga arimasu ka?", vietnamese: "Cô ơi, bây giờ cô có rảnh không ạ?" },
      { speaker: "T", japanese: "ええ、大丈夫ですよ。どうしましたか。", romaji: "Ee, daijoubu desu yo. Doushimashita ka?", vietnamese: "Ừ, cô rảnh. Có chuyện gì thế em?" },
      { speaker: "S", japanese: "実は、チケットが2枚あります。先生、一緒に行きませんか。", romaji: "Jitsu wa, chiketto ga ni-mai arimasu. Sensei, issho ni ikimasen ka?", vietnamese: "Thực ra là em có 2 tấm vé. Cô đi cùng em nhé ạ?" },
      { speaker: "T", japanese: "いいですね。何のチケットですか。", romaji: "Ii desu ne. Nan no chiketto desu ka?", vietnamese: "Hay quá nhỉ. Vé gì thế em?" },
      { speaker: "S", japanese: "イザベラ・タナカのヴァイオリンコンサートのチケットです。", romaji: "Izabera Tanaka no vaiorin konsaato no chiketto desu.", vietnamese: "Là vé buổi hòa nhạc Violin của Isabella Tanaka ạ." },
      { speaker: "T", japanese: "いつですか。今年の何月何日ですか。", romaji: "Itsu desu ka? Kotoshi no nangatsu nannichi desu ka?", vietnamese: "Khi nào thế? Năm nay, tháng mấy ngày mấy?" },
      { speaker: "S", japanese: "今年の7月19日、日曜日です。", romaji: "Kotoshi no shichi-gatsu juu-ku-nichi, nichiyoubi desu.", vietnamese: "Ngày 19 tháng 7 năm nay, vào Chủ Nhật ạ." },
      { speaker: "T", japanese: "何時に始まりますか。", romaji: "Nanji ni hajimarimasu ka?", vietnamese: "Mấy giờ bắt đầu vậy?" },
      { speaker: "S", japanese: "午後3時からですよ。", romaji: "Gogo san-ji kara desu yo.", vietnamese: "Từ 3 giờ chiều (15:00) ạ." },
      { speaker: "T", japanese: "どこですか。遠いですか。", romaji: "Doko desu ka? Tooi desu ka?", vietnamese: "Ở đâu thế? Có xa không?" },
      { speaker: "S", japanese: "さくらホールです。KAIZEN学校からとても近いです。徒歩3分ですから、歩いて行けます。", romaji: "Sakura hooru desu. KAIZEN gakkou kara totemo chikai desu. Toho san-pun desu kara, aruite ikemasu.", vietnamese: "Ở Sakura Hall ạ. Rất gần trường KAIZEN. Đi bộ mất 3 phút nên có thể đi bộ được ạ." },
      { speaker: "T", japanese: "値段はいくらですか。", romaji: "Nedan wa ikura desu ka?", vietnamese: "Giá vé bao nhiêu?" },
      { speaker: "S", japanese: "3000円です。", romaji: "San-zen en desu.", vietnamese: "3000 yên ạ." },
      { speaker: "T", japanese: "会場で何か禁止されていることはありますか。", romaji: "Kaijou de nanika kinshi sarete iru koto wa arimasu ka?", vietnamese: "Ở hội trường có cấm gì không em?" },
      { speaker: "S", japanese: "はい、写真を撮ってはいけません。そして、食べたり飲んだりしてはいけません。", romaji: "Hai, shashin o totte wa ikemasen. Soshite, tabetari nondari shite wa ikemasen.", vietnamese: "Dạ có, không được chụp ảnh, và không được ăn uống ạ." },
      { speaker: "T", japanese: "分かりました。じゃあ、どこで会いましょうか。", romaji: "Wakarimashita. Jaa, doko de aimashou ka.", vietnamese: "Cô hiểu rồi. Vậy chúng ta gặp nhau ở đâu?" },
      { speaker: "S", japanese: "KAIZEN学校の前で会いましょう。", romaji: "KAIZEN gakkou no mae de aimashou.", vietnamese: "Mình gặp nhau trước cổng trường KAIZEN cô nhé." },
      { speaker: "T", japanese: "いいですね。楽しみにしています。", romaji: "Ii desu ne. Tanoshimi ni shite imasu.", vietnamese: "Được đấy. Cô rất mong chờ." }
    ]
  },
  {
    id: "football",
    title: "Topic 2: Rủ cô giáo đi xem Trận bóng đá",
    context: "Trận bóng đá giữa FC East và Green Knights tại Sakura Stadium. Nơi này nằm cạnh trung tâm thương mại Takashimaya, cấm đi xe máy tới.",
    image: "https://placehold.co/600x400/1e293b/a5b4fc?text=Football+Match+Tickets",
    dialogues: [
      { speaker: "S", japanese: "もしもし、先生ですか。[Tên bạn]です。", romaji: "Moshi moshi, sensei desu ka. [Tên bạn] desu.", vietnamese: "Alo, cô ạ? Em là [Tên bạn] đây ạ." },
      { speaker: "T", japanese: "ああ、[Tên bạn]さん、こんにちは。", romaji: "Aa, [Tên bạn]-san, konnichiwa.", vietnamese: "À, chào em." },
      { speaker: "S", japanese: "先生、今お時間がありますか。", romaji: "Sensei, ima ojikan ga arimasu ka?", vietnamese: "Cô ơi, bây giờ cô có rảnh không ạ?" },
      { speaker: "T", japanese: "ええ、大丈夫ですよ。どうしましたか。", romaji: "Ee, daijoubu desu yo. Doushimashita ka?", vietnamese: "Ừ, cô rảnh. Có chuyện gì thế em?" },
      { speaker: "S", japanese: "実は、チケットが2枚あります。先生、一緒に行きませんか。", romaji: "Jitsu wa, chiketto ga ni-mai arimasu. Sensei, issho ni ikimasen ka?", vietnamese: "Thực ra là em có 2 tấm vé. Cô đi cùng em nhé ạ?" },
      { speaker: "T", japanese: "いいですね。何のチケットですか。", romaji: "Ii desu ne. Nan no chiketto desu ka?", vietnamese: "Hay quá. Vé gì thế em?" },
      { speaker: "S", japanese: "サッカーの試合のチケットです。FCイースト対グリーンナイツの試合です。", romaji: "Sakka no shiai no chiketto desu. FC iisuto tai guriin naitsu no shiai desu.", vietnamese: "Là vé xem trận bóng đá ạ. Trận của FC East với Green Knights." },
      { speaker: "T", japanese: "いつですか。今年の何月何日ですか。", romaji: "Itsu desu ka? Kotoshi no nangatsu nannichi desu ka?", vietnamese: "Khi nào thế? Năm nay, tháng mấy ngày mấy?" },
      { speaker: "S", japanese: "今年の8月1日、土曜日です。", romaji: "Kotoshi no hachi-gatsu tsuitachi, doyoubi desu.", vietnamese: "Ngày mùng 1 tháng 8 năm nay, vào Thứ 7 ạ." },
      { speaker: "T", japanese: "何時に始まりますか。", romaji: "Nanji ni hajimarimasu ka?", vietnamese: "Mấy giờ bắt đầu vậy?" },
      { speaker: "S", japanese: "午後6時からですよ。", romaji: "Gogo roku-ji kara desu yo.", vietnamese: "Từ 6 giờ tối (18:00) ạ." },
      { speaker: "T", japanese: "どこですか。", romaji: "Doko desu ka?", vietnamese: "Ở đâu thế?" },
      { speaker: "S", japanese: "さくらスタジアムです。高島屋の隣ですから、便利で近いです。", romaji: "Sakura sutajiamu desu. Takashimaya no tonari desu kara, benri de chikai desu.", vietnamese: "Ở Sân vận động Sakura ạ. Nó nằm ngay cạnh Takashimaya nên rất tiện và gần." },
      { speaker: "T", japanese: "バイクで行けますか。", romaji: "Baiku de ikemasu ka?", vietnamese: "Có đi xe máy đến được không?" },
      { speaker: "S", japanese: "いいえ、バイクで行ってはいけません。駐車禁止ですから、歩いて行きましょう。", romaji: "Iie, baiku de itte wa ikemasen. Chuusha kinshi desu kara, aruite ikimashou.", vietnamese: "Dạ không, không được đi xe máy đến đâu ạ. Vì cấm đỗ xe nên chúng ta đi bộ đến nhé ạ." },
      { speaker: "T", japanese: "値段はいくらですか。", romaji: "Nedan wa ikura desu ka?", vietnamese: "Giá vé bao nhiêu?" },
      { speaker: "S", japanese: "2500円です。", romaji: "Ni-sen go-hyaku en desu.", vietnamese: "2500 yên ạ." },
      { speaker: "T", japanese: "分かりました。じゃあ、どこで会いましょうか。", romaji: "Wakarimashita. Jaa, doko de aimashou ka.", vietnamese: "Cô hiểu rồi. Vậy chúng ta gặp nhau ở đâu?" },
      { speaker: "S", japanese: "高島屋の前で会いましょう。", romaji: "Takashimaya no mae de aimashou.", vietnamese: "Mình gặp nhau trước Takashimaya cô nhé." },
      { speaker: "T", japanese: "いいですね。楽しみにしています。", romaji: "Ii desu ne. Tanoshimi ni shite imasu.", vietnamese: "Được đấy. Cô rất mong chờ." }
    ]
  }
];
