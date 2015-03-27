var

u             = require('./util'),
create        = u.create,
c             = require('./curry'),
arrayFunction = c.arrayFunction,
p             = require('./primitives'),
obj           = p.obj,
fun           = p.fun,
bul           = p.bul,
arrayWrap     = p.arrayWrap,
a             = require('./apply'),
apply         = a.apply,
bound         = a.bound,
antitype      = a.antitype,
l             = require('./lists'),
initTail      = l.initTail,
each          = l.each,
all           = l.all,

isPromise = function(p){
  return obj(p)
    && fun(p.then)
    && bul(p.resolved)
    && obj(p.observers)
    ;
},
bind = function(p,fn){
  if (p.resolved) {
    return apply(fn,p,[p.value]);
  } else {
    var
    nu = Promise();
    p.observers.push(function(){
      apply(fn,this,arguments)
      .then(function(v){
        nu.resolve(v);
      });
    });
    return nu;
  }
},
promisePrototype = {
  //We need to maintain a stack initially
  //but then upon resolution, to call to
  //each fn in the stack, but then after
  //to only call observers as they are
  //registered.
  resolve: function(v){
    if(!this.resolved){
      this.value = v;
      this.resolved = true;
      var
      args = arguments,
      me = this;
      each(function(fn){
        apply(fn,me,args);
      },this.observers);
    }
    return this;
  },
  bind: antitype(bind),
  then: function(fn){
    //var me = this;
    var nu = Promise();
    if (this.resolved) {
      var result = apply(fn,this,[this.value]);
      return isPromise(result)
        ? result
        : nu.resolve(result)
        ;
    } else {
      this.observers.push(function(){
        var result = apply(fn,this,arguments);
        //don't like this branch, not real monad
        if (isPromise(result))  {
          //real monads ALWAYS return promises but then
          //we would have return Promise(5) everywhere
          // result.then(
          //   bound(nu,'resolve')
          // );
          result.then(function(v){
            nu.resolve(v);
          });
        } else {
          nu.resolve(result);
        }
      });
      return nu;
    }
  }
},
Promise = function(v){
  return create(promisePrototype,{
    observers: [],
    value:     v,
    resolved:  v ? true : false
  });
},


allIn = function(promises){
  var
  all = initTail(function(promises,promise){
    //Recursive promise consolidation, yay!
    return promises.length
    ? all(promises).then(function(results){
        return promise.then(function(v){
          results.push(v);
          return results;
        });
      })
    : promise.then(arrayWrap)
    ;
  });
  return all(promises);
},
all = arrayFunction(function(promises){
  var nu = Promise();
  allIn(promises).then(function(results){
    apply(nu.resolve,nu,results);
  });
  return nu;
}),

z;

Promise.s = {
  allIn: allIn,
  all: all
};

module.exports = Promise;
