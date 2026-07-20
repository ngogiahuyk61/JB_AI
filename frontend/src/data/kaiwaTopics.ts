export interface TopicDialogue {
  speaker: 'S' | 'T';
  japanese: string;
  romaji: string;
  vietnamese: string;
}

export interface TopicProhibition {
  icon: string;        // emoji icon
  japanese: string;    // e.g. 喫煙禁止
  sentence: string;    // e.g. たばこを吸ってはいけません
  romaji: string;      // romaji
  vietnamese: string;  // e.g. Không được hút thuốc
}

export interface KaiwaTopic {
  id: string;
  title: string;
  context: string;
  image: string;
  dialogues: TopicDialogue[];
  prohibitions?: TopicProhibition[];
}

export const KAIWA_TOPICS: KaiwaTopic[] = [
  {
    id: "concert",
    title: "Topic 1: Rủ cô giáo đi xem Concert Violin",
    context: "Buổi hòa nhạc Violin của Isabella Tanaka tại Sakura Hall. Điểm nổi bật là rất gần trường KAIZEN (đi bộ 3 phút), cấm chụp ảnh và cấm ăn uống.",
    image: "https://placehold.co/600x400/1e293b/a5b4fc?text=Violin+Concert+Tickets",
    prohibitions: [
      {
        icon: "📷",
        japanese: "撮影禁止",
        sentence: "写真を撮ってはいけません。",
        romaji: "Shashin o totte wa ikemasen.",
        vietnamese: "Không được chụp ảnh."
      },
      {
        icon: "🍔",
        japanese: "飲食禁止",
        sentence: "食べたり飲んだりしてはいけません。",
        romaji: "Tabetari nondari shite wa ikemasen.",
        vietnamese: "Không được ăn uống."
      }
    ],
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
    prohibitions: [
      {
        icon: "🏍️",
        japanese: "バイク禁止",
        sentence: "バイクで行ってはいけません。",
        romaji: "Baiku de itte wa ikemasen.",
        vietnamese: "Không được đi bằng xe máy đến."
      }
    ],
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
  },
  {
    id: "art_exhibition",
    title: "Topic 3: Rủ đi xem Triển lãm tranh",
    context: "Vé xem triển lãm tranh tại Bảo tàng mỹ thuật Sakura. Cần đi xe điện từ ga KAIZEN (15 phút), giá vé 500 yên và cấm chụp ảnh.",
    image: "https://placehold.co/600x400/312e81/c7d2fe?text=Art+Exhibition+Tickets",
    prohibitions: [
      {
        icon: "📷",
        japanese: "撮影禁止",
        sentence: "写真を撮ってはいけません。",
        romaji: "Shashin o totte wa ikemasen.",
        vietnamese: "Không được chụp ảnh."
      }
    ],
    dialogues: [
      { speaker: "S", japanese: "もしもし、先生ですか。[Tên bạn]です。", romaji: "Moshi moshi, sensei desu ka. [Tên bạn] desu.", vietnamese: "Alo, cô ạ? Em là [Tên bạn] đây ạ." },
      { speaker: "T", japanese: "ああ、[Tên bạn]さん、こんにちは。", romaji: "Aa, [Tên bạn]-san, konnichiwa.", vietnamese: "À, chào em." },
      { speaker: "S", japanese: "先生、今お時間がありますか。", romaji: "Sensei, ima ojikan ga arimasu ka?", vietnamese: "Cô ơi, bây giờ cô có rảnh không ạ?" },
      { speaker: "T", japanese: "ええ、大丈夫ですよ。どうしましたか。", romaji: "Ee, daijoubu desu yo. Doushimashita ka?", vietnamese: "Ừ, cô rảnh. Có chuyện gì thế em?" },
      { speaker: "S", japanese: "実は、チケットが2枚あります。先生、一緒に行きませんか。", romaji: "Jitsu wa, chiketto ga ni-mai arimasu. Sensei, issho ni ikimasen ka?", vietnamese: "Thực ra là em có 2 tấm vé. Cô đi cùng em nhé ạ?" },
      { speaker: "T", japanese: "いいですね。何のチケットですか。", romaji: "Ii desu ne. Nan no chiketto desu ka?", vietnamese: "Hay quá. Vé gì thế em?" },
      { speaker: "S", japanese: "さくら美術館の絵の展覧会のチケットです。", romaji: "Sakura bijutsukan no e no tenrankai no chiketto desu.", vietnamese: "Là vé xem triển lãm tranh ở Bảo tàng mỹ thuật Sakura ạ." },
      { speaker: "T", japanese: "いつですか。何年の何月何日ですか。", romaji: "Itsu desu ka? Nannen no nangatsu nannichi desu ka?", vietnamese: "Khi nào thế? Năm mấy, tháng mấy, ngày mấy?" },
      { speaker: "S", japanese: "今年の7月15日、水曜日です。", romaji: "Kotoshi no shichi-gatsu juu-go-nichi, suiyoubi desu.", vietnamese: "Ngày 15 tháng 7 năm nay, vào Thứ Tư ạ." },
      { speaker: "T", japanese: "何時に始まりますか。", romaji: "Nanji ni hajimarimasu ka?", vietnamese: "Mấy giờ bắt đầu vậy em?" },
      { speaker: "S", japanese: "午前10時からです。", romaji: "Gozen juu-ji kara desu.", vietnamese: "Từ 10 giờ sáng ạ." },
      { speaker: "T", japanese: "どこですか。遠いですか。バイクで行けますか。", romaji: "Doko desu ka? Tooi desu ka? Baiku de ikemasu ka?", vietnamese: "Ở đâu thế? Có xa không? Đi xe máy được không?" },
      { speaker: "S", japanese: "さくら美術館です。KAIZEN駅から電車で15分ですから、バイクじゃなくて電車で行きましょう。少し遠いです。", romaji: "Sakura bijutsukan desu. KAIZEN-eki kara densha de juu-go-fun desu kara, baiku janakute densha de ikimashou. Sukoshi tooi desu.", vietnamese: "Ở Bảo tàng mỹ thuật Sakura ạ. Từ ga KAIZEN đi xe điện mất 15 phút nên mình đi xe điện thay vì xe máy cô nhé. Hơi xa một chút ạ." },
      { speaker: "T", japanese: "値段はいくらですか。", romaji: "Nedan wa ikura desu ka?", vietnamese: "Giá vé bao nhiêu thế?" },
      { speaker: "S", japanese: "500円です。", romaji: "Go-hyaku en desu.", vietnamese: "500 yên ạ." },
      { speaker: "T", japanese: "会場で何か禁止されていることはありますか。写真を撮ってもいいですか。", romaji: "Kaijou de nanika kinshi sarete iru koto wa arimasu ka? Shashin o totte mo ii desu ka?", vietnamese: "Ở đó có cấm gì không em? Có được chụp ảnh không?" },
      { speaker: "S", japanese: "いいえ、写真を撮ってはいけません。", romaji: "Iie, shashin o totte wa ikemasen.", vietnamese: "Dạ không, không được phép chụp ảnh đâu ạ." },
      { speaker: "T", japanese: "分かりました。じゃあ、どこで会いましょうか。", romaji: "Wakarimashita. Jaa, doko de aimashou ka.", vietnamese: "Cô hiểu rồi. Vậy chúng ta gặp nhau ở đâu?" },
      { speaker: "S", japanese: "KAIZEN駅で会いましょう。", romaji: "KAIZEN-eki de aimashou.", vietnamese: "Mình gặp nhau ở Ga KAIZEN cô nhé." },
      { speaker: "T", japanese: "いいですね。楽しみにしています。", romaji: "Ii desu ne. Tanoshimi ni shite imasu.", vietnamese: "Được đấy. Cô rất mong chờ." }
    ]
  },
  {
    id: "movie",
    title: "Topic 4: Rủ đi xem Phim",
    context: "Vé xem bộ phim \"Tarou-chan và một chú chó\" tại Rạp chiếu phim Sakura. Đi bộ được vì rất gần trường KAIZEN (3 phút), cấm ăn uống.",
    image: "https://placehold.co/600x400/1a1a2e/e8b4b8?text=Movie+Tickets",
    prohibitions: [
      {
        icon: "🍔",
        japanese: "飲食禁止",
        sentence: "食べたり飲んだりしてはいけません。",
        romaji: "Tabetari nondari shite wa ikemasen.",
        vietnamese: "Không được ăn uống."
      }
    ],
    dialogues: [
      { speaker: "S", japanese: "もしもし、先生ですか。[Tên bạn]です。", romaji: "Moshi moshi, sensei desu ka. [Tên bạn] desu.", vietnamese: "Alo, cô ạ? Em là [Tên bạn] đây ạ." },
      { speaker: "T", japanese: "ああ、[Tên bạn]さん、こんにちは。", romaji: "Aa, [Tên bạn]-san, konnichiwa.", vietnamese: "À, chào em." },
      { speaker: "S", japanese: "先生、今お時間がありますか。", romaji: "Sensei, ima ojikan ga arimasu ka?", vietnamese: "Cô ơi, bây giờ cô có rảnh không ạ?" },
      { speaker: "T", japanese: "ええ、大丈夫ですよ。どうしましたか。", romaji: "Ee, daijoubu desu yo. Doushimashita ka?", vietnamese: "Ừ, cô rảnh. Có chuyện gì thế em?" },
      { speaker: "S", japanese: "実は、チケットが2枚あります。先生、一緒に行きませんか。", romaji: "Jitsu wa, chiketto ga ni-mai arimasu. Sensei, issho ni ikimasen ka?", vietnamese: "Thực ra là em có 2 tấm vé. Cô đi cùng em nhé ạ?" },
      { speaker: "T", japanese: "いいですね。何のチケットですか。", romaji: "Ii desu ne. Nan no chiketto desu ka?", vietnamese: "Hay quá. Vé gì thế em?" },
      { speaker: "S", japanese: "映画のチケットです。「たろうちゃんと一ぴきの犬」という映画です。", romaji: "Eiga no chiketto desu. \"Tarou-chan to ippiki no inu\" to iu eiga desu.", vietnamese: "Là vé xem phim ạ. Phim tên là \"Tarou-chan và một chú chó\"." },
      { speaker: "T", japanese: "いつですか。何年の何月何日ですか。", romaji: "Itsu desu ka? Nannen no nangatsu nannichi desu ka?", vietnamese: "Khi nào thế? Năm mấy, tháng mấy, ngày mấy?" },
      { speaker: "S", japanese: "今年の12月1日、月曜日です。", romaji: "Kotoshi no juu-ni-gatsu tsuitachi, getsuyoubi desu.", vietnamese: "Ngày mùng 1 tháng 12 năm nay, vào Thứ Hai ạ." },
      { speaker: "T", japanese: "何時に始まりますか。", romaji: "Nanji ni hajimarimasu ka?", vietnamese: "Mấy giờ bắt đầu vậy em?" },
      { speaker: "S", japanese: "18時からです。", romaji: "Juu-hachi-ji kara desu.", vietnamese: "Từ 18 giờ ạ (6 giờ tối)." },
      { speaker: "T", japanese: "どこですか。遠いですか。歩いて行けますか。", romaji: "Doko desu ka? Tooi desu ka? Aruite ikemasu ka?", vietnamese: "Ở đâu thế? Có xa không? Có đi bộ được không?" },
      { speaker: "S", japanese: "さくら映画館です。KAIZEN学校から歩いて3分ですから、とても近いです。歩いて行けます。", romaji: "Sakura eigakan desu. KAIZEN gakkou kara aruite san-pun desu kara, totemo chikai desu. Aruite ikemasu.", vietnamese: "Ở Rạp chiếu phim Sakura ạ. Đi bộ 3 phút từ trường KAIZEN nên rất gần. Có thể đi bộ được ạ." },
      { speaker: "T", japanese: "値段はいくらですか。", romaji: "Nedan wa ikura desu ka?", vietnamese: "Giá vé bao nhiêu thế?" },
      { speaker: "S", japanese: "1800円です。", romaji: "Sen-happyaku en desu.", vietnamese: "1800 yên ạ." },
      { speaker: "T", japanese: "映画館で何か禁止されていることはありますか。食べたり飲んだりしてもいいですか。", romaji: "Eigakan de nanika kinshi sarete iru koto wa arimasu ka? Tabetari nondari shite mo ii desu ka?", vietnamese: "Ở rạp chiếu phim có cấm gì không? Có được ăn uống không em?" },
      { speaker: "S", japanese: "いいえ、食べたり飲んだりしてはいけません。", romaji: "Iie, tabetari nondari shite wa ikemasen.", vietnamese: "Dạ không, không được phép ăn uống đâu ạ." },
      { speaker: "T", japanese: "分かりました。じゃあ、どこで会いましょうか。", romaji: "Wakarimashita. Jaa, doko de aimashou ka.", vietnamese: "Cô hiểu rồi. Vậy chúng ta gặp nhau ở đâu?" },
      { speaker: "S", japanese: "KAIZEN学校の門で会いましょう。", romaji: "KAIZEN gakkou no mon de aimashou.", vietnamese: "Mình gặp nhau ở cổng trường KAIZEN cô nhé." },
      { speaker: "T", japanese: "いいですね。楽しみにしています。", romaji: "Ii desu ne. Tanoshimi ni shite imasu.", vietnamese: "Được đấy. Cô rất mong chờ." }
    ]
  },
  {
    id: "piano_concert",
    title: "Topic 5: Rủ đi xem buổi hòa nhạc Piano",
    context: "Buổi hòa nhạc Piano của Mike Miller tại Tầng 1 Tòa nhà Sakura, TP. HCM. Đi bộ 5 phút từ trường KAIZEN YOSHIDA. Cấm rất nhiều thứ: hút thuốc, chụp ảnh, ăn uống, điện thoại và xe máy.",
    image: "https://placehold.co/600x400/0c0a1e/d8b4fe?text=Piano+Concert+Tickets",
    prohibitions: [
      {
        icon: "🚬",
        japanese: "喫煙禁止",
        sentence: "たばこを吸ってはいけません。",
        romaji: "Tabako o sutte wa ikemasen.",
        vietnamese: "Không được hút thuốc."
      },
      {
        icon: "📷",
        japanese: "撮影禁止",
        sentence: "写真を撮ってはいけません。",
        romaji: "Shashin o totte wa ikemasen.",
        vietnamese: "Không được chụp ảnh."
      },
      {
        icon: "🍔",
        japanese: "飲食禁止",
        sentence: "食べたり飲んだりしてはいけません。",
        romaji: "Tabetari nondari shite wa ikemasen.",
        vietnamese: "Không được ăn uống."
      },
      {
        icon: "📱",
        japanese: "携帯電話禁止",
        sentence: "携帯電話を使ってはいけません。",
        romaji: "Keitai denwa o tsukatte wa ikemasen.",
        vietnamese: "Không được sử dụng điện thoại di động."
      },
      {
        icon: "🏍️",
        japanese: "バイク禁止",
        sentence: "バイクで行ってはいけません。",
        romaji: "Baiku de itte wa ikemasen.",
        vietnamese: "Không được đi bằng xe máy đến."
      }
    ],
    dialogues: [
      { speaker: "S", japanese: "もしもし、先生ですか。[Tên bạn]です。", romaji: "Moshi moshi, sensei desu ka. [Tên bạn] desu.", vietnamese: "Alo, cô ạ? Em là [Tên bạn] đây ạ." },
      { speaker: "T", japanese: "ああ、[Tên bạn]さん、こんにちは。", romaji: "Aa, [Tên bạn]-san, konnichiwa.", vietnamese: "À, chào em." },
      { speaker: "S", japanese: "先生、今お時間がありますか。", romaji: "Sensei, ima ojikan ga arimasu ka?", vietnamese: "Cô ơi, bây giờ cô có rảnh không ạ?" },
      { speaker: "T", japanese: "ええ、大丈夫ですよ。どうしましたか。", romaji: "Ee, daijoubu desu yo. Doushimashita ka?", vietnamese: "Ừ, cô rảnh. Có chuyện gì thế em?" },
      { speaker: "S", japanese: "実は、チケットが2枚あります。先生、一緒に行きませんか。", romaji: "Jitsu wa, chiketto ga ni-mai arimasu. Sensei, issho ni ikimasen ka?", vietnamese: "Thực ra là em có 2 tấm vé. Cô đi cùng em nhé ạ?" },
      { speaker: "T", japanese: "いいですね。何のチケットですか。", romaji: "Ii desu ne. Nan no chiketto desu ka?", vietnamese: "Hay quá. Vé gì thế em?" },
      { speaker: "S", japanese: "マイク・ミラーのピアノコンサートのチケットです。", romaji: "Maiku Miraa no piano konsaato no chiketto desu.", vietnamese: "Là vé buổi hòa nhạc Piano của Mike Miller ạ." },
      { speaker: "T", japanese: "いつですか。何年の何月何日ですか。", romaji: "Itsu desu ka? Nannen no nangatsu nannichi desu ka?", vietnamese: "Khi nào thế? Năm mấy, tháng mấy, ngày mấy?" },
      { speaker: "S", japanese: "2026年6月14日、日曜日です。", romaji: "Ni-sen-nijuu-roku-nen roku-gatsu juu-yokka, nichiyoubi desu.", vietnamese: "Là ngày 14 tháng 6 năm 2026, vào Chủ Nhật ạ." },
      { speaker: "T", japanese: "何時に始まりますか。", romaji: "Nanji ni hajimarimasu ka?", vietnamese: "Mấy giờ bắt đầu vậy em?" },
      { speaker: "S", japanese: "18時30分からです。", romaji: "Juu-hachi-ji san-juppun kara desu.", vietnamese: "Từ 18 giờ 30 phút ạ." },
      { speaker: "T", japanese: "どこですか。遠いですか。バイクで行けますか。", romaji: "Doko desu ka? Tooi desu ka? Baiku de ikemasu ka?", vietnamese: "Ở đâu thế? Có xa không? Đi xe máy được không?" },
      { speaker: "S", japanese: "ホーチミン市のさくらビル1階です。KAIZEN YOSHIDA SCHOOLから歩いて5分ですから、近いです。でも、バイク禁止ですから、バイクで行ってはいけません。歩いて行きましょう。", romaji: "Hoochimin-shi no Sakura biru ikkai desu. KAIZEN YOSHIDA SCHOOL kara aruite go-fun desu kara, chikai desu. Demo, baiku kinshi desu kara, baiku de itte wa ikemasen. Aruite ikimashou.", vietnamese: "Ở tầng 1 Tòa nhà Sakura, TP. Hồ Chí Minh ạ. Đi bộ 5 phút từ trường KAIZEN YOSHIDA SCHOOL nên gần. Nhưng vì cấm xe máy nên không được đi xe máy đến. Chúng ta đi bộ nhé." },
      { speaker: "T", japanese: "値段はいくらですか。", romaji: "Nedan wa ikura desu ka?", vietnamese: "Giá vé bao nhiêu thế?" },
      { speaker: "S", japanese: "1300円です。", romaji: "Sen-san-byaku en desu.", vietnamese: "1300 yên ạ." },
      { speaker: "T", japanese: "会場で何か禁止されていることはありますか。", romaji: "Kaijou de nanika kinshi sarete iru koto wa arimasu ka?", vietnamese: "Ở hội trường có cấm gì không em?" },
      { speaker: "S", japanese: "はい、たくさんあります。たばこを吸ってはいけません。写真を撮ってはいけません。食べたり飲んだりしてはいけません。そして、携帯電話を使ってはいけません。", romaji: "Hai, takusan arimasu. Tabako o sutte wa ikemasen. Shashin o totte wa ikemasen. Tabetari nondari shite wa ikemasen. Soshite, keitai denwa o tsukatte wa ikemasen.", vietnamese: "Dạ có, có nhiều lắm ạ. Không được hút thuốc. Không được chụp ảnh. Không được ăn uống. Và không được sử dụng điện thoại di động nữa ạ." },
      { speaker: "T", japanese: "分かりました。じゃあ、どこで会いましょうか。", romaji: "Wakarimashita. Jaa, doko de aimashou ka.", vietnamese: "Cô hiểu rồi. Vậy chúng ta gặp nhau ở đâu?" },
      { speaker: "S", japanese: "KAIZEN YOSHIDA SCHOOLの門で会いましょう。", romaji: "KAIZEN YOSHIDA SCHOOL no mon de aimashou.", vietnamese: "Mình gặp nhau ở cổng trường KAIZEN YOSHIDA cô nhé." },
      { speaker: "T", japanese: "いいですね。楽しみにしています。", romaji: "Ii desu ne. Tanoshimi ni shite imasu.", vietnamese: "Được đấy. Cô rất mong chờ." }
    ]
  }
];
