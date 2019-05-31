//Variable initialization
var UserLive_cursorY = 0;
var UserLive_cursorX = 0;
var UserLive_dataEnded = false;
var UserLive_itemsCount = 0;
var UserLive_idObject = {};
var UserLive_emptyCellVector = [];
var UserLive_loadingData = false;
var UserLive_loadingDataTry = 0;
var UserLive_loadingDataTryMax = 5;
var UserLive_loadingDataTimeout = 3500;
var UserLive_itemsCountOffset = 0;
var UserLive_MaxOffset = 0;
var UserLive_loadChannelOffsset = 0;
var UserLive_emptyContent = false;

var UserLive_ids = ['ul_thumbdiv', 'ul_img', 'ul_infodiv', 'ul_displayname', 'ul_streamtitle', 'ul_streamgame', 'ul_viwers', 'ul_quality', 'ul_cell', 'ulempty_', 'user_live_scroll'];
var UserLive_status = false;
var UserLive_followerChannels = '';
var UserLive_OldUserName = '';
var UserLive_itemsCountCheck = false;

var UserLive_token = null;
//Variable initialization end

function UserLive_init() {
    Main_values.Main_CenterLablesVectorPos = 1;
    Main_values.Main_Go = Main_UserLive;
    Main_IconLoad('label_side_panel', 'icon-arrow-circle-left', STR_GOBACK);
    Main_AddClass('top_bar_user', 'icon_center_focus');
    Main_innerHTML('top_bar_user', STR_USER + Main_UnderCenter(AddUser_UsernameArray[Main_values.Users_Position].name + STR_LIVE_CHANNELS));
    document.body.addEventListener("keydown", UserLive_handleKeyDown, false);
    if (UserLive_OldUserName !== AddUser_UsernameArray[Main_values.Users_Position].name) UserLive_status = false;
    if (UserLive_status) {
        Main_YRst(UserLive_cursorY);
        Main_ShowElement(UserLive_ids[10]);
        UserLive_addFocus();
        Main_SaveValues();
    } else UserLive_StartLoad();
}

function UserLive_exit() {
    Main_values.Users_Position = 0;
    Main_RemoveClass('top_bar_user', 'icon_center_focus');
    document.body.removeEventListener("keydown", UserLive_handleKeyDown);
    Main_textContent('top_bar_user', STR_USER);
    Main_IconLoad('label_side_panel', 'icon-ellipsis', STR_SIDE_PANEL);
    Main_HideElement(UserLive_ids[10]);
}

function UserLive_StartLoad() {
    Main_empty('stream_table_user_live');
    Main_HideElement(UserLive_ids[10]);
    Main_showLoadDialog();
    Main_HideWarningDialog();
    UserLive_status = false;
    UserLive_OldUserName = AddUser_UsernameArray[Main_values.Users_Position].name;
    UserLive_loadChannelOffsset = 0;
    UserLive_itemsCountOffset = 0;
    UserLive_MaxOffset = 0;
    UserLive_idObject = {};
    UserLive_emptyCellVector = [];
    UserLive_itemsCountCheck = false;
    Main_FirstLoad = true;
    UserLive_itemsCount = 0;
    UserLive_cursorX = 0;
    UserLive_cursorY = 0;
    UserLive_dataEnded = false;
    UserLive_followerChannels = '';
    Main_CounterDialogRst();
    UserLive_loadDataPrepare();
    UserLive_CheckToken();
}

function UserLive_CheckToken() {
    UserLive_token = AddUser_UsernameArray[Main_values.Users_Position].access_token;
    if (UserLive_token) {
        UserLive_token = Main_OAuth + UserLive_token;
        UserLive_loadChannelUserLive();
    } else {
        UserLive_token = null;
        UserLive_loadDataPrepare();
        UserLive_loadChannels();
    }
}

function UserLive_loadDataPrepare() {
    Main_imgVectorRst();
    UserLive_loadingData = true;
    UserLive_loadingDataTry = 0;
    UserLive_loadingDataTimeout = 3500;
}

function UserLive_loadChannels() {
    var theUrl = 'https://api.twitch.tv/kraken/users/' + encodeURIComponent(AddUser_UsernameArray[Main_values.Users_Position].id) +
        '/follows/channels?limit=100&offset=' + UserLive_loadChannelOffsset + '&sortby=created_at';
    BasehttpGet(theUrl, UserLive_loadingDataTimeout, 2, null, UserLive_loadChannelLive, UserLive_loadDataError);
}

function UserLive_loadDataError() {
    UserLive_loadingDataTry++;
    if (UserLive_loadingDataTry < UserLive_loadingDataTryMax) {
        UserLive_loadingDataTimeout += 500;
        UserLive_loadChannels();
    } else {
        UserLive_loadingData = false;
        if (!UserLive_itemsCount) {
            Main_FirstLoad = false;
            Main_HideLoadDialog();
            Main_showWarningDialog(STR_REFRESH_PROBLEM);
            Main_CenterLablesStart(UserLive_handleKeyDown);
        } else {
            UserLive_dataEnded = true;
            UserLive_loadDataSuccessFinish();
        }
    }
}

function UserLive_loadChannelLive(responseText) {
    var response = JSON.parse(responseText).follows,
        response_items = response.length;

    if (response_items) { // response_items here is not always 99 because banned channels, so check until it is 0
        var ChannelTemp = '',
            x = 0;

        for (x; x < response_items; x++) {
            ChannelTemp = response[x].channel._id + ',';
            if (UserLive_followerChannels.indexOf(ChannelTemp) === -1) UserLive_followerChannels += ChannelTemp;
        }

        UserLive_loadChannelOffsset += response_items;
        UserLive_loadDataPrepare();
        UserLive_loadChannels();
    } else { // end
        UserLive_followerChannels = UserLive_followerChannels.slice(0, -1);
        UserLive_loadDataPrepare();
        UserLive_loadChannelUserLive();
    }
}

function UserLive_loadChannelUserLive() {
    var offset = UserLive_itemsCount + UserLive_itemsCountOffset;
    if (offset && offset > (UserLive_MaxOffset - 1)) {
        offset = UserLive_MaxOffset - Main_ItemsLimitVideo;
        UserLive_dataEnded = true;
    }

    var theUrl = 'https://api.twitch.tv/kraken/streams/';

    if (UserLive_token) {
        theUrl += 'followed?';
    } else {
        theUrl += '?channel=' + encodeURIComponent(UserLive_followerChannels) + '&';
    }
    theUrl += 'limit=' + Main_ItemsLimitVideo + '&offset=' + offset + '&stream_type=all';

    UserLive_loadChannelUserLiveGet(theUrl, UserLive_loadDataSuccess, UserLive_loadDataErrorLive, UserLive_CheckToken);
}

function UserLive_loadChannelUserLiveGet(theUrl, callbackSucess, calbackError, calbacktoken) {
    var xmlHttp;

    if (Main_Android && !UserLive_itemsCount) {

        xmlHttp = Android.mreadUrl(theUrl, UserLive_loadingDataTimeout, (UserLive_token ? 3 : 2), UserLive_token);

        if (xmlHttp) xmlHttp = JSON.parse(xmlHttp);
        else {
            UserVod_loadDataError();
            return;
        }

        if (xmlHttp.status === 200) {
            callbackSucess(xmlHttp.responseText);
        } else if (UserLive_token && (xmlHttp.status === 401 || xmlHttp.status === 403)) { //token expired
            //Token has change or because is new or because it is invalid because user delete in twitch settings
            // so callbackFuncOK and callbackFuncNOK must be the same to recheck the token
            AddCode_refreshTokens(Main_values.Users_Position, 0, calbacktoken, calbacktoken);
        } else {
            calbackError();
        }

    } else {

        xmlHttp = new XMLHttpRequest();

        xmlHttp.open("GET", theUrl, true);
        xmlHttp.timeout = UserLive_loadingDataTimeout;

        xmlHttp.setRequestHeader(Main_clientIdHeader, Main_clientId);
        xmlHttp.setRequestHeader(Main_AcceptHeader, Main_TwithcV5Json);
        if (UserLive_token) xmlHttp.setRequestHeader(Main_Authorization, UserLive_token);

        xmlHttp.ontimeout = function() {};

        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState === 4) {
                if (xmlHttp.status === 200) {
                    callbackSucess(xmlHttp.responseText);
                } else if (UserLive_token && (xmlHttp.status === 401 || xmlHttp.status === 403)) { //token expired
                    //Token has change or because is new or because it is invalid because user delete in twitch settings
                    // so callbackFuncOK and callbackFuncNOK must be the same to recheck the token
                    AddCode_refreshTokens(Main_values.Users_Position, 0, calbacktoken, calbacktoken);
                } else {
                    calbackError();
                }
            }
        };

        xmlHttp.send(null);
    }
}

function UserLive_loadDataErrorLive() {
    UserLive_loadingDataTry++;
    if (UserLive_loadingDataTry < UserLive_loadingDataTryMax) {
        UserLive_loadingDataTimeout += 500;
        UserLive_loadChannelUserLive();
    } else {
        UserLive_loadingData = false;

        if (!UserLive_itemsCount) {
            Main_FirstLoad = false;
            Main_HideLoadDialog();
            Main_showWarningDialog(STR_REFRESH_PROBLEM);
            Main_CenterLablesStart(UserLive_handleKeyDown);
        } else {
            UserLive_dataEnded = true;
            UserLive_loadDataSuccessFinish();
        }

    }
}

function UserLive_loadDataSuccess(responseText) {
    var response = JSON.parse(responseText);
    var response_items = response.streams.length;
    UserLive_MaxOffset = parseInt(response._total);

    if (response_items < Main_ItemsLimitVideo) UserLive_dataEnded = true;

    var offset_itemsCount = UserLive_itemsCount;
    UserLive_itemsCount += response_items;

    UserLive_emptyContent = !UserLive_itemsCount;

    var response_rows = response_items / Main_ColoumnsCountVideo;
    if (response_items % Main_ColoumnsCountVideo > 0) response_rows++;

    var coloumn_id, row_id, row, stream, id,
        cursor = 0,
        doc = document.getElementById("stream_table_user_live");

    for (var i = 0; i < response_rows; i++) {
        row_id = offset_itemsCount / Main_ColoumnsCountVideo + i;
        row = document.createElement('tr');

        for (coloumn_id = 0; coloumn_id < Main_ColoumnsCountVideo && cursor < response_items; coloumn_id++, cursor++) {
            stream = response.streams[cursor];
            id = stream.channel._id;
            if (UserLive_idObject[id]) coloumn_id--;
            else {
                UserLive_idObject[id] = 1;
                row.appendChild(Main_createCellVideo(row_id, row_id + '_' + coloumn_id,
                    [stream.channel.name, id], UserLive_ids,
                    [stream.preview.template.replace("{width}x{height}", Main_VideoSize),
                        Main_is_playlist(JSON.stringify(stream.stream_type)) + stream.channel.display_name,
                        stream.channel.status, stream.game,
                        STR_SINCE + Play_streamLiveAt(stream.created_at) + ' ' +
                        STR_FOR + Main_addCommas(stream.viewers) + STR_VIEWER,
                        Main_videoqualitylang(stream.video_height, stream.average_fps, stream.channel.broadcaster_language)
                    ]));
            }
        }

        for (coloumn_id; coloumn_id < Main_ColoumnsCountVideo; coloumn_id++) {
            if (UserLive_dataEnded && !UserLive_itemsCountCheck) {
                UserLive_itemsCountCheck = true;
                UserLive_itemsCount = (row_id * Main_ColoumnsCountVideo) + coloumn_id;
            }
            row.appendChild(Main_createEmptyCell(UserLive_ids[9] + row_id + '_' + coloumn_id));
            UserLive_emptyCellVector.push(UserLive_ids[9] + row_id + '_' + coloumn_id);
        }
        doc.appendChild(row);
    }

    UserLive_loadDataSuccessFinish();
}

function UserLive_loadDataSuccessFinish() {
    if (!UserLive_status) {
        if (UserLive_emptyContent) {
            Main_CenterLablesStart(UserLive_handleKeyDown);
            Main_showWarningDialog(STR_NO + STR_LIVE_CHANNELS);
        } else {
            UserLive_status = true;
            UserLive_addFocus();
            Main_imgVectorLoad(IMG_404_VIDEO);
            Main_SaveValues();
        }
        Main_ShowElement(UserLive_ids[10]);
        Main_FirstLoad = false;
        Main_HideLoadDialog();
    } else {
        Main_imgVectorLoad(IMG_404_VIDEO);
        if (UserLive_emptyCellVector.length > 0 && !UserLive_dataEnded) {
            UserLive_loadDataPrepare();
            UserLive_loadChannelsReplace();
            return;
        } else {
            UserLive_addFocus(true);
            UserLive_emptyCellVector = [];
        }
    }
    UserLive_loadingData = false;
}

function UserLive_loadChannelsReplace() {
    Main_SetItemsLimitReplace(UserLive_emptyCellVector.length);

    var offset = UserLive_itemsCount + UserLive_itemsCountOffset;
    if (offset && offset > (UserLive_MaxOffset - 1)) {
        offset = UserLive_MaxOffset - Main_ItemsLimitReplace;
        UserLive_dataEnded = true;
    }

    var theUrl = 'https://api.twitch.tv/kraken/streams/';

    if (UserLive_token) {
        theUrl += 'followed?';
    } else {
        theUrl += '?channel=' + encodeURIComponent(UserLive_followerChannels) + '&';
    }
    theUrl += 'followed?limit=limit=' + Main_ItemsLimitReplace + '&offset=' + offset + '&stream_type=all';

    UserLive_loadChannelUserLiveGet(theUrl, UserLive_loadDataSuccessReplace, UserLive_loadDataErrorReplace, UserLive_loadChannelsReplace);
}

function UserLive_loadDataErrorReplace() {
    UserLive_loadingDataTry++;
    if (UserLive_loadingDataTry < UserLive_loadingDataTryMax) {
        UserLive_loadingDataTimeout += 500;
        UserLive_loadChannelsReplace();
    } else {
        UserLive_dataEnded = true;
        UserLive_itemsCount -= UserLive_emptyCellVector.length;
        UserLive_emptyCellVector = [];
        UserLive_loadDataSuccessFinish();
    }
}

function UserLive_loadDataSuccessReplace(responseText) {
    var response = JSON.parse(responseText),
        response_items = response.streams.length,
        stream, id, i = 0,
        cursor = 0,
        tempVector = [];

    UserLive_MaxOffset = parseInt(response._total);

    if (response_items < Main_ItemsLimitReplace) UserLive_dataEnded = true;


    for (i; i < UserLive_emptyCellVector.length && cursor < response_items; i++, cursor++) {
        stream = response.streams[cursor];
        id = stream.channel._id;
        if (UserLive_idObject[id]) i--;
        else {
            UserLive_idObject[id] = 1;
            Main_replaceVideo(UserLive_emptyCellVector[i], [stream.channel.name, id], [stream.preview.template.replace("{width}x{height}", Main_VideoSize),
                Main_is_playlist(JSON.stringify(stream.stream_type)) + stream.channel.display_name,
                stream.channel.status, stream.game,
                STR_SINCE + Play_streamLiveAt(stream.created_at) + ' ' + STR_FOR + Main_addCommas(stream.viewers) + STR_VIEWER,
                Main_videoqualitylang(stream.video_height, stream.average_fps, stream.channel.broadcaster_language)
            ], UserLive_ids);

            tempVector.push(i);
        }
    }

    for (i = tempVector.length - 1; i > -1; i--) UserLive_emptyCellVector.splice(tempVector[i], 1);

    UserLive_itemsCountOffset += cursor;
    if (UserLive_dataEnded) {
        UserLive_itemsCount -= UserLive_emptyCellVector.length;
        UserLive_emptyCellVector = [];
    }

    UserLive_loadDataSuccessFinish();
}

function UserLive_addFocus(forceScroll) {
    Main_addFocusVideo(UserLive_cursorY, UserLive_cursorX, UserLive_ids, Main_ColoumnsCountVideo, UserLive_itemsCount, forceScroll);

    if (((UserLive_cursorY + Main_ItemsReloadLimitVideo) > (UserLive_itemsCount / Main_ColoumnsCountVideo)) &&
        !UserLive_dataEnded && !UserLive_loadingData) {
        UserLive_loadDataPrepare();
        UserLive_loadChannels();
    }
    if (Main_CenterLablesInUse) UserLive_removeFocus();
}

function UserLive_removeFocus() {
    if (UserLive_itemsCount) Main_removeFocus(UserLive_cursorY + '_' + UserLive_cursorX, UserLive_ids);
}

function UserLive_handleKeyDown(event) {
    if (Main_FirstLoad || Main_CantClick()) return;
    else Main_keyClickDelayStart();

    var i;

    switch (event.keyCode) {
        case KEY_RETURN:
            if (Main_isControlsDialogShown()) Main_HideControlsDialog();
            else if (Main_isAboutDialogShown()) Main_HideAboutDialog();
            else {
                UserLive_removeFocus();
                Main_CenterLablesStart(UserLive_handleKeyDown);
            }
            Sidepannel_RestoreScreen();
            break;
        case KEY_LEFT:
            if (!UserLive_cursorX) {
                UserLive_removeFocus();
                Sidepannel_Start(UserLive_handleKeyDown, true);
            } else if (Main_ThumbNull((UserLive_cursorY), (UserLive_cursorX - 1), UserLive_ids[0])) {
                UserLive_removeFocus();
                UserLive_cursorX--;
                UserLive_addFocus();
            } else {
                for (i = (Main_ColoumnsCountVideo - 1); i > -1; i--) {
                    if (Main_ThumbNull((UserLive_cursorY - 1), i, UserLive_ids[0])) {
                        UserLive_removeFocus();
                        UserLive_cursorY--;
                        UserLive_cursorX = i;
                        UserLive_addFocus();
                        break;
                    }
                }
            }
            break;
        case KEY_RIGHT:
            if (Main_ThumbNull((UserLive_cursorY), (UserLive_cursorX + 1), UserLive_ids[0])) {
                UserLive_removeFocus();
                UserLive_cursorX++;
                UserLive_addFocus();
            } else if (Main_ThumbNull((UserLive_cursorY + 1), 0, UserLive_ids[0])) {
                UserLive_removeFocus();
                UserLive_cursorY++;
                UserLive_cursorX = 0;
                UserLive_addFocus();
            }
            break;
        case KEY_UP:
            if (!UserLive_cursorY) {
                UserLive_removeFocus();
                Main_CenterLablesStart(UserLive_handleKeyDown);
            } else {
                for (i = 0; i < Main_ColoumnsCountVideo; i++) {
                    if (Main_ThumbNull((UserLive_cursorY - 1), (UserLive_cursorX - i), UserLive_ids[0])) {
                        UserLive_removeFocus();
                        UserLive_cursorY--;
                        UserLive_cursorX = UserLive_cursorX - i;
                        UserLive_addFocus();
                        break;
                    }
                }
            }
            break;
        case KEY_DOWN:
            for (i = 0; i < Main_ColoumnsCountVideo; i++) {
                if (Main_ThumbNull((UserLive_cursorY + 1), (UserLive_cursorX - i), UserLive_ids[0])) {
                    UserLive_removeFocus();
                    UserLive_cursorY++;
                    UserLive_cursorX = UserLive_cursorX - i;
                    UserLive_addFocus();
                    break;
                }
            }
            break;
        case KEY_PLAY:
        case KEY_PAUSE:
        case KEY_PLAYPAUSE:
        case KEY_ENTER:
            Main_OpenLiveStream(UserLive_cursorY + '_' + UserLive_cursorX, UserLive_ids, UserLive_handleKeyDown);
            break;
        default:
            break;
    }
}