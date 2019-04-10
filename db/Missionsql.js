var MissionSQL = {
   //发布任务
   issueWork: 'INSERT INTO mission (mission_id,mission_order,description,title,label,mission_statu,location,validtime,create_time,score,master,master_name) values(null,round(round(rand(),10)*10000000000),?,?,?,0,?,?,?,?,?,?)',
   //查询任务列表
   queryAllTask:'SELECT * FROM mission',
   //任务超时则更改任务状态
   changeTaskStatus:'UPDATE mission set mission_statu=? WHERE mission_id=?',
   //查询所有mission_statu = 0的（未接单）任务
   queryAllStatu :'SELECT * FROM mission WHERE mission_statu = 0',
   //查看任务详情
   details:'SELECT * FROM mission WHERE mission_id =?',
   //接收任务
   accept:'UPDATE mission set mission_statu=?,slave=?,slave_name=?,accepttime=? WHERE mission_id=?',
   //完成任务
   achieve:'UPDATE mission set mission_statu=?,end_time=? WHERE mission_id=?',
   //如果任务超时未确认完成，把接收时间作为end_time
   //如果任务超时未被接单，把创建任务时间作为end_time 和 accept_time
   //任务被点击次数+1 ==用于显示浏览次数
   changeTimes:'UPDATE mission set times=? WHERE mission_id=?',
   //根据任务标签进行模糊查询
   top:'SELECT * FROM mission WHERE label like ? and mission_statu = 0',
   //除了关键字之外的模糊搜索
   apartTop :'SELECT * FROM mission WHERE label not like ? and mission_statu = 0',
   secondTop:'SELECT * FROM mission WHERE label like ? and mission_statu = 0',
   thirdTop:'SELECT * FROM mission WHERE label like ? and mission_statu = 0',
   forthTop:'SELECT * FROM mission WHERE label like ? and mission_statu = 0',
   //查看所有被打工仔接收的且正在进行中的任务
   queryAllAccepted : 'SELECT * FROM mission WHERE master = ? and mission_statu = 1',
};
module.exports = MissionSQL;