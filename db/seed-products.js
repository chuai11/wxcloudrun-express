// 首次启动自动导入的商品，结构与小程序 data/products.js 一致
module.exports = [
  {
    id: 'p01',
    title: '眉县猕猴桃 国家地理标志',
    subtitle: '秦岭北麓徐香/翠香，果香浓郁、维C丰富',
    category: '鲜果',
    price: 49.9,
    originPrice: 69,
    sales: 0,
    stock: 520,
    cover: '/images/products/meixian-kiwi-1.jpg',
    images: [
      '/images/products/meixian-kiwi-1.jpg',
      '/images/products/meixian-kiwi-2.jpg',
      '/images/products/meixian-kiwi-3.jpg'
    ],
    tags: ['地理标志', '眉县直发'],
    specs: [
      { name: '5斤装 徐香', price: 49.9 },
      { name: '9斤装 徐香', price: 86 },
      { name: '5斤装 翠香', price: 52.9 }
    ],
    params: [
      { k: '产地', v: '陕西省宝鸡市眉县（秦岭北麓、渭河沿岸）' },
      { k: '品种', v: '徐香 / 翠香 / 海沃德（按季供应）' },
      { k: '认证', v: '国家地理标志产品' },
      { k: '储存', v: '常温催熟后冷藏，果肉变软即可食用' }
    ],
    detailHtml: [
      '眉县地处秦岭北麓、渭河沿岸，昼夜温差大、土壤有机质高，是全国最大的猕猴桃集中产区之一。果形端正、果肉细腻、果香浓郁，维生素C含量高，耐储运。',
      '主栽徐香、翠香、海沃德等品种。可鲜食，也可制成果干、果酱或果酒；到货偏硬时请室温放置变软后再吃，口感最佳。'
    ]
  },
  {
    id: 'p02',
    title: '岐山臊子面 非遗风味',
    subtitle: '薄筋光、煎稀汪、酸辣香，西府待客第一面',
    category: '速食',
    price: 39.9,
    originPrice: 56,
    sales: 0,
    stock: 680,
    cover: '/images/products/qishan-saozi-1.jpg',
    images: [
      '/images/products/qishan-saozi-1.jpg',
      '/images/products/qishan-saozi-2.jpg',
      '/images/products/qishan-saozi-3.jpg'
    ],
    tags: ['地理标志', '非遗风味'],
    specs: [
      { name: '单人份 臊子面套餐', price: 39.9 },
      { name: '3人份家庭装', price: 99 },
      { name: '臊子礼盒（面+醋+臊子）', price: 128 }
    ],
    params: [
      { k: '产地', v: '陕西省宝鸡市岐山县' },
      { k: '特点', v: '薄、筋、光；煎、稀、汪；酸、辣、香' },
      { k: '内容', v: '细面、猪肉臊子、香醋汤料（礼盒含香醋等）' },
      { k: '食用', v: '沸水煮面 3–4 分钟，加入臊子与汤料即可' }
    ],
    detailHtml: [
      '岐山臊子面为国家地理标志与非遗风味代表：面条筋道，臊子由猪肉、胡萝卜、木耳、豆腐等制成，汤酸辣鲜香。周文化发源地待客宴席常见「只吃面、不喝汤」古俗。',
      '现已工业化真空包装，适合早餐、加班与想家时来一碗；可按口味自行加辣或加醋。'
    ]
  },
  {
    id: 'p03',
    title: '凤翔西凤酒 凤香型白酒',
    subtitle: '凤香型标杆，甘润挺爽、诸味协调',
    category: '酒水',
    price: 268,
    originPrice: 328,
    sales: 0,
    stock: 160,
    cover: '/images/products/fengxiang-xifeng-1.jpg',
    images: [
      '/images/products/fengxiang-xifeng-1.jpg',
      '/images/products/fengxiang-xifeng-2.jpg',
      '/images/products/fengxiang-xifeng-3.jpg'
    ],
    tags: ['地理标志', '凤香型'],
    specs: [
      { name: '500ml 52%vol 单瓶', price: 268 },
      { name: '500ml×2 礼盒', price: 518 }
    ],
    params: [
      { k: '产地', v: '陕西省宝鸡市凤翔区（古称雍城）' },
      { k: '香型', v: '凤香型白酒' },
      { k: '原料工艺', v: '高粱为原料，大麦、豌豆制曲' },
      { k: '提示', v: '请理性饮酒，未成年人禁止购买' }
    ],
    detailHtml: [
      '西凤酒为国家地理标志保护产品，是凤香型白酒典型代表。酒液清透、醇香典雅，入口甘润挺爽，具有「不上头、不干喉、回味愉快」的风格特点。',
      '西府宴席、节庆与礼赠常见选择。请适量饮酒，驾车请勿饮酒；未成年人禁止购买。'
    ]
  },
  {
    id: 'p04',
    title: '陇县鲜羊奶 关山牧场',
    subtitle: '关山草原奶源，口感细腻、膻味低',
    category: '乳品',
    price: 42.9,
    originPrice: 55,
    sales: 0,
    stock: 360,
    cover: '/images/products/longxian-milk-1.jpg',
    images: [
      '/images/products/longxian-milk-1.jpg',
      '/images/products/longxian-milk-2.jpg',
      '/images/products/longxian-milk-3.jpg'
    ],
    tags: ['陇县直发', '冷链配送'],
    specs: [
      { name: '200ml×8盒 鲜羊奶', price: 42.9 },
      { name: '200ml×16盒 鲜羊奶', price: 78 },
      { name: '400g 纯羊奶粉体验装', price: 98 }
    ],
    params: [
      { k: '产地', v: '陕西省宝鸡市陇县（关山草原产区）' },
      { k: '奶源', v: '莎能、关中奶山羊为主' },
      { k: '特点', v: '乳脂与乳蛋白含量较高，膻味较低' },
      { k: '储存', v: '鲜奶请冷藏 2–6℃；奶粉阴凉干燥密封' }
    ],
    detailHtml: [
      '陇县坐拥关山草原天然生态牧场，是国内优质奶山羊养殖核心产区之一。高寒温润、草场资源丰富，产出羊奶口感细腻、膻味较低，适合鲜饮与日常营养补充。',
      '本地亦发展纯羊奶粉、常温酸奶等深加工产品。下单鲜奶后冷链发出，请收到后尽快冷藏。'
    ]
  },
  {
    id: 'p05',
    title: '秦岭土蜂蜜 渭滨山花',
    subtitle: '中蜂百花蜜，自然成熟、无添加',
    category: '蜜酿',
    price: 88,
    originPrice: 118,
    sales: 0,
    stock: 210,
    cover: '/images/products/weibin-honey-1.jpg',
    images: ['/images/products/weibin-honey-1.jpg', '/images/products/weibin-honey-2.jpg'],
    tags: ['秦岭深山', '中蜂百花'],
    specs: [
      { name: '500g 玻璃瓶', price: 88 },
      { name: '500g×2 礼袋装', price: 168 }
    ],
    params: [
      { k: '产地', v: '陕西省宝鸡市渭滨区秦岭山区' },
      { k: '蜜种', v: '中华蜜蜂（中蜂）山花百花蜜' },
      { k: '工艺', v: '自然成熟取蜜，不浓缩、不勾兑' },
      { k: '结晶', v: '低温下自然结晶属正常现象' }
    ],
    detailHtml: [
      '渭滨区南依秦岭主脉，本地以中华土蜂自然放养为主，采集山间野生花草与山花蜜源酿造。蜂蜜色泽通透或自然结晶，花香层次丰富，甜而不腻。',
      '可温水冲饮，也可搭配糕点、粥品。结晶后用不超过 40℃ 温水隔水融化即可。一岁以内婴儿请勿食用蜂蜜。'
    ]
  }
]
