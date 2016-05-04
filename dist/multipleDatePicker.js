/*
 @author : Maelig GOHIN For ARCA-Computing - www.arca-computing.fr
 @date: January 2016
 @version: 0.0.1

 @description:  MultipleDatePicker is an Angular directive to show a simple calendar allowing user to select multiple dates.
 Css style can be changed by editing less or css stylesheet.
 See scope declaration below for options you can pass through html directive.
 Feel free to edit and share this piece of code, our idea is to keep it simple ;)
 */
angular.module('multipleDatePicker', [])
  .factory('multipleDatePickerBroadcast', ['$rootScope', function ($rootScope) {
      var sharedService = {};

      sharedService.calendarId = null;
      sharedService.message = '';

      sharedService.resetOrder = function (calendarId) {
          this.message = 'reset';
          this.calendarId = calendarId;
          this.broadcastItem();
      };

      sharedService.broadcastItem = function () {
          $rootScope.$broadcast('handleMultipleDatePickerBroadcast');
      };

      sharedService.broadcastModifiedDate = function (oldDate, newDate) {
          $rootScope.$broadcast('multipleDatePickerModifiedDate', {'oldDate': oldDate, 'newDate': newDate});
      };

      return sharedService;
  }])
  .directive('multipleDatePicker', ['$log', 'multipleDatePickerBroadcast', function ($log, multipleDatePickerBroadcast) {
      "use strict";
      return {
          restrict: 'AE',
          scope: {
              /*
               * Type : String/Long (avoid 0 value)
               * Will be used to identified calendar when using broadcast messages
               * */
              calendarId: '=?',
              dayClick: '=?',
              dayHover: '=?',

              /*
               * Type: moment date
               * Month to be displayed
               * Default is current month
               */
              month: '=?',

              /*
               * Type: function(newMonth, oldMonth)
               * Will be called when month changed
               * Param newMonth/oldMonth will be the first day of month at midnight
               * */
              monthChanged: '=?',
              /*
               * Type: array of milliseconds timestamps
               * Days already selected
               * */
              daysSelected: '=?',
              /*
               * Type: array of integers
               * Recurrent week days not selectables
               * /!\ Sunday = 0, Monday = 1 ... Saturday = 6
               * */
              weekDaysOff: '=?',
              /*
               * Type: array of objects cf doc
               * Days highlights
               * */
              highlightDays: '=?',
              /*
               * Type: integer
               * Number of optional days to emphasize on either side of each daysSelected day. Default: 0
               */
              bufferDays: '=?',
              /*
               * Type: Array of date strings.
               * Dates used to determine which days are buffer days in the calendar, originating from the
               * server.
               */
              originalDaysSelected: '=?',
              /*
               * Type: boolean
               * Determines whether click selects a new day, or starts transaction to modify an already-selected day (i.e. from the server) --
               * days that are not currently selected in the calendar or are not buffer days will not be selectable.
               * Defaults to false.
               */
              modifyOnly: '=?',
              /*
               * Type: boolean
               * Set all days off
               * */
              allDaysOff: '=?',
              /*
               * Type: boolean
               * Sunday be the first day of week, default will be Monday
               * */
              sundayFirstDay: '=?',
              /*
               * Type: boolean
               * if true can't go back in months before today's month
               * */
              disallowBackPastMonths: '=?',
              /*
               * Type: boolean
               * if true can't go in future months after today's month
               * */
              disallowGoFutureMonths: '=?',
              /*
               * Type: boolean
               * if true empty boxes will be filled with days of previous/next month
               * */
              showDaysOfSurroundingMonths: '=?',
              /*
               * Type: string
               * CSS classes to apply to days of next/previous months
               * */
              cssDaysOfSurroundingMonths: '=?',
              /*
               * Type: Array
               * Array of  objects {label: <String>, value: <MomentObject>} used for nav select and month select restriction
               */
              calendarRange: '=?',
              /*
               * Type: boolean
               * if true events on empty boxes (or next/previous month) will be fired
               * */
              fireEventsForDaysOfSurroundingMonths: '=?',
              /*
               * Type: any type moment can parse
               * If filled will disable all days before this one (not included)
               * */
              disableDaysBefore: '=?',
              /*
               * Type: any type moment can parse
               * If filled will disable all days after this one (not included)
               * */
              disableDaysAfter: '=?'
          },
          template: '<div class="multiple-date-picker">' +
          '<div class="picker-top-row">' +
          '<div class="text-center picker-navigate picker-navigate-left-arrow" ng-class="{\'disabled\':disableBackButton}" ng-click="previousMonth()">&lt;</div>' +
          '<div class="text-center picker-month" ng-if="!calendarSelect">{{month.format(\'MMMM YYYY\')}}</div>' +
          '<div class="text-center picker-month" ng-if="calendarSelect"><select ng-options="mo.value as mo.label for mo in scope.calendarRange" ng-model="month"></select></div>' +
          '<div class="text-center picker-navigate picker-navigate-right-arrow" ng-class="{\'disabled\':disableNextButton}" ng-click="nextMonth()">&gt;</div>' +
          '</div>' +
          '<div class="picker-days-week-row">' +
          '<div class="text-center" ng-repeat="day in daysOfWeek">{{day}}</div>' +
          '</div>' +
          '<div class="picker-days-row">' +
          '<div class="text-center picker-day {{!day.otherMonth || showDaysOfSurroundingMonths ? day.css : \'\'}} {{day.otherMonth ? cssDaysOfSurroundingMonths : \'\'}}" title="{{day.title}}" ' +
          'ng-repeat="day in days" ng-click="toggleDay($event, day)" ng-mouseover="hoverDay($event, day)" ng-mouseleave="dayHover($event, day)" ' +
          'ng-class="{\'picker-selected\':day.selected, \'picker-off\':!day.selectable, \'today\':day.today,\'past\':day.past,\'future\':day.future,' +
          ' \'picker-other-month\':day.otherMonth, \'buffer-day\':day.bufferDay.length > 0 && showBufferDays(day), \'deselected-day\': day.deselected }"> ' +
          '{{day ? day.otherMonth && !showDaysOfSurroundingMonths ? \'&nbsp;\' : day.format(\'D\') : \'\'}}' +
          '</div>' +
          '</div>' +
          '</div>',
          link: function (scope) {

              /*utility functions*/
              var DEBUG = true;
              var checkNavigationButtons = function () {
                    var today = moment(),
                      previousMonth = moment(scope.month).subtract(1, 'month'),
                      nextMonth = moment(scope.month).add(1, 'month');
                    scope.disableBackButton = scope.disallowBackPastMonths && today.isAfter(previousMonth, 'month') || checkCalendarRange('start');
                    scope.disableNextButton = scope.disallowGoFutureMonths && today.isBefore(nextMonth, 'month') || checkCalendarRange('end');
                },
                getDaysOfWeek = function () {
                    /*To display days of week names in moment.lang*/
                    var momentDaysOfWeek = moment().localeData()._weekdaysMin,
                      days = [];

                    for (var i = 1; i < 7; i++) {
                        days.push(momentDaysOfWeek[i]);
                    }

                    if (scope.sundayFirstDay) {
                        days.splice(0, 0, momentDaysOfWeek[0]);
                    } else {
                        days.push(momentDaysOfWeek[0]);
                    }

                    return days;
                },
                reset = function () {
                    var daysSelected = scope.daysSelected || [],
                      originalDaysSelected = scope.originalDaysSelected || [],
                      originalMomentDates = [],
                      momentDates = [];

                    daysSelected.map(function (timestamp) {
                        momentDates.push(timestamp === 'skipped' ? 'skipped' : moment(timestamp));
                    });

                    originalDaysSelected.map(function (timestamp) {
                        originalMomentDates.push(moment(timestamp));
                    });

                    scope.convertedDaysSelected = momentDates;
                    scope.convertedOriginalDaysSelected = originalMomentDates;
                    scope.generate();
                },
                checkCalendarRange = function (endpoint) {
                    if (scope.calendarRange && scope.calendarRange.length > 1) {
                        var endpointMonth = (endpoint === 'start') ? scope.calendarRange[0].value : scope.calendarRange[scope.calendarRange.length - 1].value;
                        return scope.month.format('MMMM YYYY') === endpointMonth.format('MMMM YYYY');
                    }
                    return false;
                },
                getAssociatedDateIndex = function (date, type) {
                    date = momentize(date);
                    var dateString, dateIndex, dateArray;
                    dateString = date.format('YYYY-MM-DD');
                    dateArray = type === 'original' ? 'originalDaysSelected' : 'daysSelected';
                    return scope[dateArray].indexOf(dateString);
                },
                getDateByIndex = function (idx, type) {
                    var dateArray = type === 'original' ? 'originalDaysSelected' : 'daysSelected';
                    return scope[dateArray][idx];
                },
                getAssociatedOriginalDate = function (date) {
                    return scope.originalDaysSelected[getAssociatedDateIndex(date, 'modified')];
                },
                getAssociatedModifiedDate = function (date) {
                    return scope.daysSelected[getAssociatedDateIndex(date, 'original')];
                },
                setAssociatedModifiedDate = function (date, value) {
                    date = momentize(date);
                    value = value ? value : date;
                    if (getAssociatedOriginalDate(date)) {
                        scope.daysSelected[getAssociatedDateIndex(date, 'original')] = value;
                    }
                },
                momentize = function (date) {
                    return moment(date);
                },
                debugLog = function (data) {
                    if (DEBUG) {
                        console.log(data);
                    }
                };

              scope.init = function () {
                  if (scope.calendarRange && scope.calendarRange.length > 0) {
                      scope.month = scope.calendarRange[0].value;
                      scope.disableBackButton = true;
                  } else {
                      scope.month = moment(moment().format('MMMM YYYY'));
                  }

                  scope.generate();
              };

              /* broadcast functions*/
              scope.$on('handleMultipleDatePickerBroadcast', function () {
                  if (multipleDatePickerBroadcast.message === 'reset' && (!multipleDatePickerBroadcast.calendarId || multipleDatePickerBroadcast.calendarId === scope.calendarId)) {
                      reset();
                  }
              });

              /*scope functions*/
              scope.$watch('daysSelected', function (newValue) {
                  if (newValue) {
                      reset();
                  }
              }, true);

              scope.$watch('weekDaysOff', function () {
                  scope.generate();
              }, true);

              scope.$watch('highlightDays', function () {
                  scope.generate();
              }, true);

              scope.$watch('allDaysOff', function () {
                  scope.generate();
              }, true);

              //internal scope variables

              //Default values.
              scope.month = scope.month || moment().startOf('day');
              scope.days = [];
              scope.convertedDaysSelected = scope.convertedDaysSelected || [];
              scope.weekDaysOff = scope.weekDaysOff || [];
              scope.daysOff = scope.daysOff || [];
              scope.disableBackButton = false;
              scope.disableNextButton = false;
              scope.daysOfWeek = getDaysOfWeek();
              scope.cssDaysOfSurroundingMonths = scope.cssDaysOfSurroundingMonths || 'picker-empty';
              scope.modifyOnly = scope.modifyOnly || false;
              scope.bufferDays = scope.bufferDays || 0;
              scope.calendarRange = scope.calendarRange || false;

              // Methods.

              /**
               * Called when user clicks a date
               * @param Event event the click event
               * @param Moment momentDate a moment object extended with selected and isSelectable booleans
               * @see #momentDate
               * @callback dayClick
               */
              scope.toggleDay = function (event, momentDate) {
                  event.preventDefault();

                  if (momentDate.otherMonth && !scope.fireEventsForDaysOfSurroundingMonths) {
                      return;
                  }

                  var prevented = false;

                  event.preventDefault = function () {
                      prevented = true;
                  };

                  if (scope.modifyOnly) {
                      if (!momentDate.selected && !momentDate.bufferDay) { //unselected and not a buffer day
                          if (getAssociatedOriginalDate(momentDate)) { //check if it was a de-selected date
                              momentDate.selected = true;
                              multipleDatePickerBroadcast.broadcastModifiedDate(angular.copy(momentDate), angular.copy(momentDate));
                              setAssociatedModifiedDate(momentDate);
                              debugLog('Deselected original date re-selected.');
                              return;
                          } else { //plain ol' day - do nothing.
                              debugLog('Any old day. No nothing. Reset buffers.');
                              return;
                          }
                      }
                      if (momentDate.selected) { //currently selected date - deselect
                          momentDate.selected = false;
                          setAssociatedModifiedDate(momentDate, 'skipped');
                          multipleDatePickerBroadcast.broadcastModifiedDate(angular.copy(momentDate), 'skipped');
                          debugLog('Date deselected.');
                          return;
                      }
                      if (momentDate.bufferDay) {
                          var changeSent = false;
                          angular.forEach(momentDate.bufferDay, function (date) {
                              if (scope.isDeselectedDay(scope, date) && !changeSent) {
                                  multipleDatePickerBroadcast.broadcastModifiedDate(date, momentDate);
                                  setAssociatedModifiedDate(momentDate);
                                  changeSent = true;
                                  debugLog('Buffer day selected - broadcasting.');
                                  return;
                              } else {
                                  debugLog('Buffer day clicked - original day not deselected. Do nothing.');
                                  return;
                              }
                          });
                      }
                  } else {
                      if (typeof scope.dayClick == 'function') {
                          scope.dayClick(event, momentDate);
                      }

                      if (momentDate.selectable && !prevented) {
                          momentDate.selected = !momentDate.selected;

                          if (momentDate.selected) {
                              scope.convertedDaysSelected.push(momentDate);
                          } else {
                              scope.convertedDaysSelected = scope.convertedDaysSelected.filter(function (date) {
                                  return date.valueOf() !== momentDate.valueOf();
                              });
                          }
                      }
                  }
              };

              /**
               * Hover day
               * @param Event event
               * @param Moment day
               */
              scope.hoverDay = function (event, day) {
                  event.preventDefault();
                  var prevented = false;

                  event.preventDefault = function () {
                      prevented = true;
                  };

                  if (typeof scope.dayHover == 'function') {
                      scope.dayHover(event, day);
                  }

                  if (!prevented) {
                      day.hover = event.type === 'mouseover' ? true : false;
                  }
              };

              /*Navigate to previous month*/
              scope.previousMonth = function () {
                  if (!scope.disableBackButton) {
                      var oldMonth = moment(scope.month);
                      scope.month = scope.month.subtract(1, 'month');
                      if (typeof scope.monthChanged == 'function') {
                          scope.monthChanged(scope.month, oldMonth);
                      }
                      scope.generate();
                  }
              };

              /*Navigate to next month*/
              scope.nextMonth = function () {
                  if (!scope.disableNextButton) {
                      var oldMonth = moment(scope.month);
                      scope.month = scope.month.add(1, 'month');
                      if (typeof scope.monthChanged == 'function') {
                          scope.monthChanged(scope.month, oldMonth);
                      }
                      scope.generate();
                  }
              };

              /*Check if the date is off : unselectable*/
              scope.isDayOff = function (scope, date) {
                  return scope.allDaysOff ||
                    (!!scope.disableDaysBefore && moment(date).isBefore(scope.disableDaysBefore, 'day')) ||
                    (!!scope.disableDaysAfter && moment(date).isAfter(scope.disableDaysAfter, 'day')) ||
                    (angular.isArray(scope.weekDaysOff) && scope.weekDaysOff.some(function (dayOff) {
                        return date.day() === dayOff;
                    })) ||
                    (angular.isArray(scope.daysOff) && scope.daysOff.some(function (dayOff) {
                        return date.isSame(dayOff, 'day');
                    })) ||
                    (angular.isArray(scope.highlightDays) && scope.highlightDays.some(function (highlightDay) {
                        return date.isSame(highlightDay.date, 'day') && !highlightDay.selectable;
                    }));
              };

              /*Check if the date is selected*/
              scope.isSelected = function (scope, date) {
                  return scope.convertedDaysSelected.some(function (d) {
                      return d === 'skipped' ? false : date.isSame(d, 'day');
                  });
              };

              /**
               * Checks if date is an original pay date, and currently does not have a
               * modified date.
               *
               * @param scope
               * @param date
               * @returns {boolean}
               */
              scope.isDeselectedDay = function (scope, date) {
                  var dateIndex = getAssociatedDateIndex(date, 'original');
                  return dateIndex > -1 && getDateByIndex(dateIndex, 'modified') === 'skipped';
              };

              /**
               * Sets the bufferDay attribute on each date on the calendar.
               * @param scope
               * @param date
               * @returns {Array}
               */
              scope.isBufferDay = function (scope, date) {
                  var bufferArray = [];
                  if (scope.convertedOriginalDaysSelected && scope.convertedOriginalDaysSelected.length) {
                      angular.forEach(scope.convertedOriginalDaysSelected, function (selectedDay) {
                          var buffer;
                          var beforeBuffer = moment(selectedDay).subtract(scope.bufferDays, 'days');
                          var afterBuffer = moment(selectedDay).add(scope.bufferDays, 'days');
                          buffer = moment(date).isBetween(beforeBuffer, afterBuffer);
                          if (buffer) {
                              bufferArray.push(selectedDay.format('YYYY-MM-DD'));
                          }
                      });
                  }
                  return bufferArray;
              };

              /**
               * Check that an active date to modify is associated with a given
               * buffer day to highlight it in the calendar.
               *
               * @param associatedDateArray {Array}
               * @returns {boolean}
               */
              scope.showBufferDays = function (day) {
                  var showArray = [];
                  if (day.bufferDay.length > 0) {
                      angular.forEach(day.bufferDay, function (date) {
                          var modifiedDate = getAssociatedModifiedDate(date);
                          showArray.push(modifiedDate === 'skipped');
                      });
                  }
                  return showArray.some(function (e) { return e === true; });
              };

              /**
               * Generated the days in the calendar, setting attributes for each one.
               */
              scope.generate = function () {
                  var previousDay = moment(scope.month).date(0).day(scope.sundayFirstDay ? 0 : 1).subtract(1, 'day');

                  if (moment(scope.month).date(0).diff(previousDay, 'day') > 6) {
                      previousDay = previousDay.add(1, 'week');
                  }

                  var firstDayOfMonth = moment(scope.month).date(1),
                    days = [],
                    now = moment(),
                    lastDay = moment(firstDayOfMonth).endOf('month'),
                    createDate = function () {
                        var date = moment(previousDay.add(1, 'day'));
                        if (angular.isArray(scope.highlightDays)) {
                            var hlDay = scope.highlightDays.filter(function (d) {
                                return date.isSame(d.date, 'day');
                            });
                            date.css = hlDay.length > 0 ? hlDay[0].css : '';
                            date.title = hlDay.length > 0 ? hlDay[0].title : '';
                        }
                        date.selectable = !scope.isDayOff(scope, date);
                        date.selected = scope.isSelected(scope, date);
                        if (date.selected) {
                            date.originalDate = getAssociatedOriginalDate(date);
                        }
                        date.bufferDay = !date.selected && date.selectable ? scope.isBufferDay(scope, date) : false;
                        date.deselected = !date.selected && date.bufferDay ? scope.isDeselectedDay(scope, date) : false;
                        date.today = date.isSame(now, 'day');
                        date.past = date.isBefore(now, 'day');
                        date.future = date.isAfter(now, 'day');
                        if (!date.isSame(scope.month, 'month')) {
                            date.otherMonth = true;
                        }
                        return date;
                    },
                    maxDays = lastDay.diff(previousDay, 'days'),
                    lastDayOfWeek = scope.sundayFirstDay ? 6 : 0;

                  if (lastDay.day() !== lastDayOfWeek) {
                      maxDays += (scope.sundayFirstDay ? 6 : 7) - lastDay.day();
                  }

                  for (var j = 0; j < maxDays; j++) {
                      days.push(createDate());
                  }

                  scope.days = days;
                  checkNavigationButtons();
              };

              scope.init();
          }
      };
  }]);
