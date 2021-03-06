var async = require('async');
var express = require('express');
var router = express.Router();
var query = require('../db/DBConfig');
var missionSQL = require('../db/Missionsql');
var userSQL = require('../db/Usersql');
var labelSQL = require('../db/Labelsql');
var moment = require('moment');
/* push */
'use strict';
//var GeTui = require('./GT.push');
var GeTui = require('../node_modules/nodejsDemo4.0.1.0/GT.push');
//var Target = require('./getui/Target');
var Target = require('../node_modules/nodejsDemo4.0.1.0/getui/Target');

//var SingleMessage = require('./getui/message/SingleMessage');
var SingleMessage = require('../node_modules/nodejsDemo4.0.1.0/getui/message/SingleMessage');
//var TransmissionTemplate = require('./getui/template/TransmissionTemplate');
var TransmissionTemplate = require('../node_modules/nodejsDemo4.0.1.0/getui/template/TransmissionTemplate');
var NotificationTemplate = require('../node_modules/nodejsDemo4.0.1.0/getui/template/NotificationTemplate');
var APPID = 'dg52AT3NpQArApulOh2EU';
var APPKEY = 'FC6vbbYwdO8OG3LDNNSGU4';
var MASTERSECRET = 'IMGDYwmCSC7W7uDLcPuGR1';

var responseJSON = function (res, ret) {
  if (typeof ret === 'undefined') {
    res.json({
      status: '-200',
      msg: '操作失败'
    });
    return;
  } else {
    res.json(ret);
  }
};
//发布任务
router.post('/issue', async (req, res) => {
  var task = req.body;
  var master = task.master;
  var score = task.score;
  var title = task.title;
  var description = task.description;
  var label = task.label;
  var location = task.location;
  var master_name = ''
  var contact = task.contact;
  var create_time = moment().format("YYYY-MM-DD HH:mm:ss")
  var validtime = moment(task.validtime).format("YYYY-MM-DD HH:mm:ss")
  var data = {}
  if (validtime < create_time) {
    data.status = -1;
    data.msg = "有效时间不能小于当前时间"
  } else {
    const rows = await query(userSQL.getUserById, [master])
    if (rows) {
      var sss = '';
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].user_id == master) {
          sss = rows[i].score;
          sss = (sss - score);
          master_name = rows[i].user_name
        }
      }
    }
    await query(userSQL.updateScoreById, [sss, master])
    var str = [description, title, label, location, validtime, create_time, score, master, master_name, contact]
    const issueWork = await query(missionSQL.issueWork, str)
    //不使用await 返回的issueWork是promise对象，无法获取值
    if (issueWork) {
      data.status = 0;
      data.msg = "任务发布成功"
    }
  }
  responseJSON(res, data);
})
//接收任务
router.post('/accept', async (req, res) => {
  var data = {}
  var mission_id = req.body.mission_id;
  var user_id = req.body.user_id;//打工仔id
  var mission_statu = 1;
  var accepttime = moment().format("YYYY-MM-DD HH:mm:ss")
  var mstatu = '';
  var mid = '';
  var slave_name = '';//打工仔用户名
  var master_id = '';//雇主id
  var CID = ''//雇主clientID
  var qqq='';
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mstatu = 3;
        mid = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mstatu, mid]);
    }
  }
  var slave = await query(userSQL.getUserById, [user_id])
  //获取当前任务详情
  var mdata = await query(missionSQL.details, [mission_id])
  if (mdata) {
    for (let i = 0; i < mdata.length; i++) {
      qqq = mdata[i].mission_id;
      if (mdata[i].mission_statu === 0) {//任务状态必须为0
        if (mdata[i].master != user_id) {//雇主与打工仔不能是同一人
          master_id = mdata[i].master;
          for (let i = 0; i < slave.length; i++) {
            slave_name = slave[i].user_name
          }
          var str = [mission_statu, user_id, slave_name, accepttime, mission_id]
          var isacceptted = await query(missionSQL.accept, str)
          var isDone = false;
          if (isacceptted) {
            data.status = 0;
            data.msg = "success",
              data.data = "true"
            isDone = true;
          }
          //任务接取成功，此时给雇主发送消息
          if (isDone == true) {
            //根据雇主id获取其cid
            var getCID = await query(userSQL.getUserById, [master_id])
            for (let i = 0; i < getCID.length; i++) {
              CID = getCID[i].clientid;
            }
            var HOST = 'http://sdk.open.api.igexin.com/apiex.htm';
            var gt = new GeTui(HOST, APPKEY, MASTERSECRET);

            gt.connect(function () {
              pushMessageToSingle();
            });
            function pushMessageToSingle() {
              var template = NotificationTemplateDemo();
              //单推消息体
              var message = new SingleMessage({
                data: template  //设置推送消息类型
              });
              //接收方
              var target = new Target({
                appId: APPID,
                clientId: CID
              });
              target.setAppId(APPID).setClientId(CID);
              gt.pushMessageToSingle(message, target, function (err, res) {
                if (err != null && err.exception != null && err.exception instanceof RequestError) {
                  var requestId = err.exception.requestId;
                  console.log(err.exception.requestId);
                  //发送异常重传
                  gt.pushMessageToSingle(message, target, requestId, function (err, res) {
                    console.log(err);
                    console.log(res);
                  });
                }
              });
            }
            function NotificationTemplateDemo() {
              var template = new NotificationTemplate({
                appId: APPID,
                appKey: APPKEY,
                title: '新的任务消息',
                text: '您的任务已被打工仔'+slave_name+'接取',
                logoUrl: 'http://wwww.igetui.com/logo.png',
                isRing: true,
                isVibrate: true,
                isClearable: false,
                transmissionType: 2,
                transmissionContent: '新的任务消息（离线内容）'
              });
              return template;
            }


          }





        } else {
          data.status = -200
          data.msg = "不能接取自己发布的任务"
        }
      } else if (mdata[i].mission_statu === 1) {
        data.status = -1
        data.msg = "任务进行中,不可接取"
      } else if (mdata[i].mission_statu === 2) {
        data.status = -2
        data.msg = "任务已经完成,不可接取"
      } else if (mdata[i].mission_statu === 3) {
        data.status = -3
        data.msg = "任务超时！"
      }
    }
  }
  responseJSON(res, data);
})
//完成任务
router.post('/achieve', async (req, res) => {
  var data = {}
  var flag = '';
  var mission_id = req.body.mission_id;
  var user_id = req.body.user_id;//打工仔id
  var mission_statu = 2;
  var end_time = moment().format("YYYY-MM-DD HH:mm:ss")
  var mstatu = '';
  var mid = '';
  var _master = '' //如果超时则把积分退还给雇主
  var _score = ''//任务积分
  var score = ''
  //判断是否超时
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      if (queryAll[i].validtime < end_time) {
        mstatu = 3;
        mid = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mstatu, mid]);
    }
  }
  data.data = {}
  var mdata = await query(missionSQL.details, [mission_id])
  for (let i = 0; i < mdata.length; i++) {
    if (mdata[i].mission_statu == 1 && mdata[i].slave == user_id) {
      flag = 1;
    } else if (mdata[i].mission_statu == 2 && mdata[i].slave == user_id) {
      flag = 2;
    } else if (mdata[i].mission_statu == 3 && mdata[i].slave == user_id) {
      flag = 3;
    }
    if (flag == 1) {
      _score = mdata[i].score;
      //获取该任务积分--送给打工仔
      var str = [mission_statu, end_time, mission_id]
      await query(missionSQL.achieve, str)
      var slave = await query(userSQL.getUserById, [user_id])//先获取打工仔积分
      for (let i = 0; i < slave.length; i++) {
        score = slave[i].score + _score //任务确认完成打工仔获得积分
      }
      await query(userSQL.updateScoreById, [score, user_id])
      var DATA = await query(missionSQL.details, [mission_id])
      for (let i = 0; i < DATA.length; i++) {
        data.data = DATA[i];
      }
      data.status = 0;
      data.msg = "任务已完成"
    } else if (flag == 2) {
      data.status = -2;
      data.msg = "任务已完成，不能重复提交"
    } else if (flag == 3) {
      _score = mdata[i].score;
      _master = mdata[i].master;
      var query_master = await query(userSQL.getUserById, [_master])
      for (let i = 0; i < query_master.length; i++) {
        score = query_master[i].score + _score //任务超时把积分退还给雇主
      }
      await query(userSQL.updateScoreById, [score, _master])
      var DATA = await query(missionSQL.details, [mission_id])
      for (let i = 0; i < DATA.length; i++) {
        data.data = DATA[i];
      }
      data.status = -3;
      data.msg = "任务已超时，不能提交，下次加油"
    }
  }
  responseJSON(res, data);
})
//查看所有未接单任务
router.get('/unaccpetedlist', async (req, res) => {
  var msg = req.query || req.params;
  var mission_statu = msg.mission_statu;
  var mission_id = msg.mission_id;
  var data = {}
  data.data = {}
  const queryInfo = await query(missionSQL.queryAllTask)
  if (queryInfo) {
    for (let i = 0; i < queryInfo.length; i++) {
      //未接单超时任务自动更改任务状态
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryInfo[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryInfo[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  //查询所有未接单任务
  const task = await query(missionSQL.queryAllStatu);
  var unacceptTask = [];
  var isQuery = false;
  if (task) {
    isQuery = true;
    for (let i = 0; i < task.length; i++) {
      unacceptTask[i] = task[i];
    }
    //console.log(task.length)
  }
  if (isQuery == true) {
    data.data = unacceptTask;
    data.status = 0;
    data.msg = "查询未接单任务成功"
  }
  responseJSON(res, data);
})
//查看所有任务
router.get('/worklist', async (req, res) => {
  var mission_statu = '';
  var mission_id = '';
  var data = {}
  data.data = {}
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      //未接单超时任务自动更改任务状态
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  //重新查询所有任务
  const taskall = await query(missionSQL.queryAllTask);
  var list = [];
  var isQuery = false;
  if (taskall) {
    isQuery = true;
    for (let i = 0; i < taskall.length; i++) {
      list[i] = taskall[i];
    }
  }
  if (isQuery == true) {
    data.data = list;
    data.status = 0;
    data.msg = "查询所有任务成功"
  } else if (taskall.length == 0) {
    data.msg = "暂无数据";
    data.status = -1;
  }
  responseJSON(res, data);
})
//查看任务详情
router.post('/details', async (req, res) => {
  var mid = req.body.mission_id;
  var uid = req.body.user_id;//当前用户id 用于统计点击次数
  var data = {}
  data.data = {}
  var mission_statu = ''
  var Times = ''
  var midIsExist = false;
  var queryAll = await query(labelSQL.queryAll)
  for (let i = 0; i < queryAll.length; i++) {
    if (queryAll[i].user_id == uid) midIsExist = true;
  }
  var ddata = await query(missionSQL.details, [mid])
  for (let i = 0; i < ddata.length; i++) {
    Times = ddata[i].times + 1;
    if (midIsExist == true) {
      if (ddata[i].label == "跑腿") query(labelSQL.Shelp, [uid])
      if (ddata[i].label == "代取") query(labelSQL.Stake, [uid])
      if (ddata[i].label == "兼职") query(labelSQL.Sparttime, [uid])
      if (ddata[i].label == "技能") query(labelSQL.Sskill, [uid])
    } else {
      if (ddata[i].label == "跑腿") query(labelSQL.Fhelp, [uid])
      if (ddata[i].label == "代取") query(labelSQL.Ftake, [uid])
      if (ddata[i].label == "兼职") query(labelSQL.Fparttime, [uid])
      if (ddata[i].label == "技能") query(labelSQL.Fskill, [uid])
    }
  }
  query(missionSQL.changeTimes, [Times, mid])
  var ddatas = await query(missionSQL.details, [mid])
  for (let i = 0; i < ddatas.length; i++) {
    data.data = ddata[i];
    data.status = 0;
    data.msg = "success"
  }
  responseJSON(res, data);
})
//查看推荐列表
router.post('/recommend', async (req, res) => {
  var userID = req.body.user_id;
  var max = await query(labelSQL.compared, [userID])
  var arr = []
  var data = {}
  data.data = {}
  var mission_statu = ''
  var mission_id = ''
  //未接单超时任务自动更改任务状态
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  for (let i = 0; i < max.length; i++) {
    // 1、定义一个数组，把label表中当前用户对不同标签任务的浏览次数分别取出来 
    arr = [
      { label: '跑腿', value: max[i].help },
      { label: '代取', value: max[i].take },
      { label: '兼职', value: max[i].parttime },
      { label: '技能', value: max[i].skill },
    ]
    // 2、使用sort对数组进行排序，由大到小
    // 再依次获取由大到小的任务标签，赋值给like_param等四个变量
    arr.sort((a, b) => { return b.value - a.value });
    var like_param = arr[0].label
    var second_param = arr[1].label
    var third_param = arr[2].label
    var forth_param = arr[3].label
  }
  // 3、定义一个容器，根据刚才排序得到的标签顺序，查询任务表中所有相同任务类型的未接单任务
  // 比如：排序得到的浏览量最高的标签为【跑腿】，现在就根据标签【跑腿】查询任务表，获取所有任务类型为【跑腿】的未接单任务
  // 其它同理可依次获取
  var Data = []
  var top = await query(missionSQL.top, [like_param])
  var second = await query(missionSQL.top, [second_param])
  var third = await query(missionSQL.top, [third_param])
  var forth = await query(missionSQL.top, [forth_param])
  // 4、把上一步查询到的列表依次添加到数组Data中，得到排序后的任务列表
  for (let i = 0; i < top.length; i++) { Data.push(top[i]); }
  for (let i = 0; i < second.length; i++) { Data.push(second[i]); }
  for (let i = 0; i < third.length; i++) { Data.push(third[i]); }
  for (let i = 0; i < forth.length; i++) { Data.push(forth[i]); }
  // 5、如果用户登陆但没有产生浏览记录，重新查询任务表，默认按时间顺序显示
  if (Data.length == 0) {
    var task = await query(missionSQL.queryAllStatu);
    var unacceptTask = [];
    var isQuery = false;
    if (task) {
      isQuery = true;
      for (let i = 0; i < task.length; i++) {
        unacceptTask[i] = task[i];
      }
    }
    if (isQuery == true) {
      data.data = unacceptTask.reverse();
      data.status = 0;
      data.msg = "查询未接单任务成功"
    }
    // 6、如果产生了权重，继续返回排序后的任务列表
  } else {
    data.data = Data;
    data.status = 0;
    data.msg = "查询推荐任务成功"
  }

  responseJSON(res, data);
})
//任务搜索
router.post('/search', async (req, res) => {
  var key = req.body.keywords;
  var max = await query(missionSQL.Like, [key, key, key, key])
  var data = {}
  data.data = {}
  const likeStr = []
  var flag = false;
  if (max) {
    for (let i = 0; i < max.length; i++) {
      likeStr[i] = max[i];
    }
    flag = true;
  }
  if (flag == true) {
    data.data = likeStr;
    data.msg = 'success'
    data.status = 0;
  }
  responseJSON(res, data);
})
/* ******** 雇主 ******** */
//雇主--已发布的所有未接单任务
router.post('/master_status0', async (req, res) => {
  var myTask = req.body;
  var master = myTask.user_id;
  var _res = res;
  var mission_statu = '';
  var mission_id = '';
  var data = {}
  data.data = {}
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  var myMission = await query(missionSQL.getTask, [master])
  var list = [];
  var isQuery = false;
  if (myMission) {
    isQuery = true;
    for (let i = 0; i < myMission.length; i++) {
      list[i] = myMission[i];
    }
  }
  if (isQuery == true) {
    data.data = list;
    data.status = 0;
    data.msg = "success"
  }
  //console.log(data.data)
  responseJSON(_res, data);
})
//雇主发布的--正在进行的任务（已被打工仔接取）
router.post('/master_status1', async (req, res) => {
  var master = req.body.user_id;
  var data = {}
  data.data = {}
  var mission_statu = '';
  var mission_id = '';
  var str = []
  var flag = false;
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  var outcome = await query(missionSQL.queryAllAccepted, [master])
  for (let i = 0; i < outcome.length; i++) {
    str[i] = outcome[i]
    flag = true;
  }
  if (outcome.length == 0) {
    data.msg = "暂无数据";
    data.status = -1;
  } else if (flag == true) {
    data.data = str;
    data.msg = "success";
    data.status = 0;
  }
  responseJSON(res, data);
})
//雇主发布的--已完成的任务（已被打工仔确认完成）
router.post('/master_status2', async (req, res) => {
  var master = req.body.user_id;
  var data = {}
  data.data = {}
  var mission_statu = '';
  var mission_id = '';
  var str = []
  var flag = false;
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  var outcome = await query(missionSQL.queryAllDone, [master])
  for (let i = 0; i < outcome.length; i++) {
    str[i] = outcome[i]
    flag = true;
  }
  if (outcome.length == 0) {
    data.msg = "暂无数据";
    data.status = -1;
  } else if (flag == true) {
    data.data = str;
    data.msg = "success";
    data.status = 0;
  }
  responseJSON(res, data);
})
//雇主发布的--已超时
router.post('/master_status3', async (req, res) => {
  var master = req.body.user_id;
  var data = {}
  data.data = {}
  var mission_statu = '';
  var mission_id = '';
  var str = []
  var flag = false;
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  var outcome = await query(missionSQL.overTime, [master])
  for (let i = 0; i < outcome.length; i++) {
    str[i] = outcome[i]
    flag = true;
  }
  if (outcome.length == 0) {
    data.msg = "暂无数据";
    data.status = -1;
  } else if (flag == true) {
    data.data = str;
    data.msg = "success";
    data.status = 0;
  }
  responseJSON(res, data);
})
/* ******** 打工仔 ******** */
//打工仔--已接取的进行中的任务
router.post('/slave_status1', async (req, res) => {
  var myTask = req.body;
  var slave = myTask.user_id;
  var _res = res;
  var mission_statu = '';
  var mission_id = '';
  var data = {}
  data.data = {}
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  var myMission = await query(missionSQL.getAccept, [slave])
  var list = [];
  var isQuery = false;
  if (myMission) {
    isQuery = true;
    for (let i = 0; i < myMission.length; i++) {
      list[i] = myMission[i]
    }
  }
  if (isQuery == true) {
    if (list.length != 0) {
      data.data = list;
      data.status = 0;
      data.msg = "查询成功"
    } else {
      data.data = "null"
      data.status = -1;
      data.msg = "暂无数据"
    }

  }
  responseJSON(_res, data);
})
//打工仔--已完成的任务
router.post('/slave_status2', async (req, res) => {
  var myTask = req.body;
  var slave = myTask.user_id;
  var _res = res;
  var mission_statu = '';
  var mission_id = '';
  var data = {}
  data.data = {}
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  var myMission = await query(missionSQL.getDone, [slave])
  var list = [];
  var isQuery = false;
  if (myMission) {
    isQuery = true;
    for (let i = 0; i < myMission.length; i++) {
      list[i] = myMission[i]
    }
  }
  if (isQuery == true) {
    if (list.length != 0) {
      data.data = list;
      data.status = 0;
      data.msg = "查询成功"
    } else {
      data.data = "null"
      data.status = -1;
      data.msg = "暂无数据"
    }

  }
  responseJSON(_res, data);
})
//打工仔--已接取但超时的任务
router.post('/slave_status3', async (req, res) => {
  var myTask = req.body;
  var slave = myTask.user_id;
  var _res = res;
  var mission_statu = '';
  var mission_id = '';
  var data = {}
  data.data = {}
  var queryAll = await query(missionSQL.queryAllTask)
  if (queryAll) {
    for (let i = 0; i < queryAll.length; i++) {
      var curtime = moment().format("YYYY-MM-DD HH:mm:ss");
      if (queryAll[i].validtime < curtime) {
        mission_statu = 3;
        mission_id = queryAll[i].mission_id;
      }
      await query(missionSQL.changeTaskStatus, [mission_statu, mission_id]);
    }
  }
  var myMission = await query(missionSQL.getTime, [slave])
  var list = [];
  var isQuery = false;
  if (myMission) {
    isQuery = true;
    for (let i = 0; i < myMission.length; i++) {
      list[i] = myMission[i]
    }
  }
  if (isQuery == true) {
    if (list.length != 0) {
      data.data = list;
      data.status = 0;
      data.msg = "查询成功"
    } else {
      data.data = "null"
      data.status = -1;
      data.msg = "暂无数据"
    }

  }
  responseJSON(_res, data);
})
module.exports = router;