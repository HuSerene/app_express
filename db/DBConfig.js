const mysql = require('mysql')
const pool = mysql.createPool({
    host: '39.107.97.203',
    user: 'root',
    password: 'cohahada070701', 
    database: 'node',
    port: 3306,
    timezone:"08:00"
})
let query = function( sql, values ) {
  // 返回一个 Promise
  return new Promise(( resolve, reject ) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        reject( err )
      } else {
        connection.query(sql, values, ( err, rows) => {
          if ( err ) {
            reject( err )
          } else {
            resolve( rows )
          }
          connection.release()
        })
      }
    })
  })
}

module.exports =  query